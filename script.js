// QR코드 크기와 여백
const QR_SIZE = 640; // 저장되는 JPG의 대략적인 크기(px)
const QR_MARGIN = 4; // QR코드 둘레의 흰 여백(칸 수). 4칸이 표준이라 스캔이 잘 됨

const form = document.getElementById("url-form");
const input = document.getElementById("url-input");
const message = document.getElementById("message");
const canvas = document.getElementById("qr-canvas");
const qrButton = document.getElementById("qr-button");
const qrUrl = document.getElementById("qr-url");
const statusText = document.getElementById("status");

function showMessage(text) {
  message.textContent = text;
}

// 입력값을 웹사이트 주소로 정리함. 앞에 http:// 나 https:// 가 없으면 https:// 를 붙임
function normalizeUrl(value) {
  const text = value.trim();
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;

  try {
    const url = new URL(withProtocol);
    // 아이디·비밀번호(@)가 들어간 주소(예: 이메일 주소, mailto:)는 거름
    if (url.username || url.password) {
      return null;
    }
    // 도메인에는 영문·숫자·점(.)·하이픈(-)만 있어야 함 (한글 도메인은 xn--로 시작하는 형태로 바뀐 뒤 검사됨)
    if (!/^[a-z0-9.-]+$/.test(url.hostname)) {
      return null;
    }
    // 점(.)이 없는 주소(예: "hello")는 웹사이트 주소가 아니므로 거름
    if (!url.hostname.includes(".") && url.hostname !== "localhost") {
      return null;
    }
    return url.href;
  } catch (error) {
    return null;
  }
}

// 주소를 QR코드로 바꿔 캔버스에 그림
function drawQrCode(text) {
  const qr = qrcode(0, "M"); // 0: 주소 길이에 맞게 크기 자동 선택, M: 15%가 가려져도 읽힘
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount(); // 한 줄의 칸 수
  const cell = Math.max(1, Math.floor(QR_SIZE / (count + QR_MARGIN * 2)));
  const size = cell * (count + QR_MARGIN * 2);
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // JPG에는 투명색이 없으므로 흰 바탕을 먼저 칠함
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#111111";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        ctx.fillRect((col + QR_MARGIN) * cell, (row + QR_MARGIN) * cell, cell, cell);
      }
    }
  }
}

// [생성하기] 버튼을 누르거나 Enter를 치면 QR코드 생성
form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!input.value.trim()) {
    showMessage("URL을 입력해 주세요.");
    input.focus();
    return;
  }

  // 한글 자음·모음(예: ㅈㅈㅈ)이 섞여 있으면 한/영 키가 한글로 되어 있는 경우가 많음
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(input.value)) {
    showMessage("한/영 키를 확인해 주세요. 주소는 영문으로 입력해야 합니다.");
    input.focus();
    return;
  }

  const url = normalizeUrl(input.value);
  if (!url) {
    showMessage("올바른 웹사이트 주소를 입력해 주세요. (예: www.sdu.ac.kr)");
    input.focus();
    return;
  }

  try {
    drawQrCode(url);
  } catch (error) {
    console.error(error);
    const tooLong = String(error).includes("overflow");
    showMessage(tooLong ? "주소가 너무 길어서 QR코드로 만들 수 없습니다." : "QR코드 생성 중 오류가 발생했습니다.");
    return;
  }

  showMessage("");
  qrUrl.textContent = url;
  statusText.textContent = `QR코드가 만들어졌습니다: ${url}`;
  document.body.classList.add("is-generated"); // 입력창은 아래로, QR코드는 가운데에 나타남
});

// QR코드를 클릭하면 JPG 파일로 다운로드
qrButton.addEventListener("click", () => {
  canvas.toBlob((blob) => {
    if (!blob) {
      showMessage("JPG 파일을 만들지 못했습니다.");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "qrcode.jpg";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10000);
  }, "image/jpeg", 0.95);
});

// 마우스 위치에 따라 배경 그라데이션 색이 조금씩 바뀜
document.addEventListener("mousemove", (event) => {
  const x = event.clientX / window.innerWidth; // 0(왼쪽) ~ 1(오른쪽)
  const y = event.clientY / window.innerHeight; // 0(위) ~ 1(아래)
  const style = document.documentElement.style;
  style.setProperty("--mouse-x", `${(x * 100).toFixed(1)}%`);
  style.setProperty("--mouse-y", `${(y * 100).toFixed(1)}%`);
  style.setProperty("--hue", Math.round(190 + x * 140)); // 하늘색(190) ~ 분홍색(330)
});
