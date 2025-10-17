const questions = [
    {
        id: 1,
        category: "문화권",
        text: "한국, 중국, 일본을 제외한 서양 요리에 속하나요?",
        note: "가장 큰 범주 구분",
    },
    {
        id: 2,
        category: "주재료_육류",
        text: "주재료로 고기(육류)가 필수적으로 사용되나요?",
        note: "주 단백질 구분",
    },
    {
        id: 3,
        category: "형태_국물",
        text: "먹을 때 따뜻한 국물이 중요한 역할을 하나요?",
        note: "형태 구분",
    },
    {
        id: 4,
        category: "탄수화물_면빵",
        text: "재료가 면(麵)이나 빵이 주식의 역할을 하나요? (밥 제외)",
        note: "탄수화물 형태",
    },
    {
        id: 5,
        category: "맛_매운맛",
        text: "음식이 매운맛을 기본으로 가지고 있나요?",
        note: "맛 선호도",
    },
    {
        id: 6,
        category: "조리법_튀김볶음",
        text: "재료를 기름에 튀기거나 볶는 조리 과정을 거치나요?",
        note: "조리법",
    },
    {
        id: 7,
        category: "주재료_해산물",
        text: "주재료로 해산물(어류, 조개, 갑각류 등)이 필수적으로 사용되나요?",
        note: "주 단백질 상세",
    },
    {
        id: 8,
        category: "식사형태",
        text: "주로 밥상 위에서 밥과 함께 먹는 요리인가요? (밥 자체는 아님)",
        note: "식사 형태",
    },
    {
        id: 9,
        category: "소스_양념의존도",
        text: "음식을 먹을 때 소스나 양념을 듬뿍 찍거나 비벼 먹는 형태인가요?",
        note: "맛의 구성",
    },
    {
        id: 10,
        category: "온도_계절특성",
        text: "차갑게 먹거나 시원한 맛으로 여름에 주로 찾는 음식인가요?",
        note: "온도/계절 특성",
    },
];

let currentQuestion = 0;
let answersLog = [];
const gameId = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
let carouselPosition = 0;

// =================================================================
//                            공통 유틸리티 함수
// =================================================================

function scrollCarousel(direction) {
    const track = document.getElementById("carouselTrack");
    const cardWidth = 310;
    carouselPosition += direction * cardWidth;

    const trackWidth = track.scrollWidth;
    const wrapperWidth = track.parentElement.clientWidth;
    const maxScroll = wrapperWidth - trackWidth;

    if (carouselPosition > 0) carouselPosition = 0;
    if (carouselPosition < maxScroll) carouselPosition = maxScroll;

    track.style.transform = `translateX(${carouselPosition}px)`;
}

function startGame() {
    const startScreen = document.getElementById("startScreen");
    if (startScreen) startScreen.remove();

    document.getElementById("chatInput").style.display = "flex";

    addBotMessage("안녕하세요! 음식 취향 분석을 시작하겠습니다. 😊");

    setTimeout(() => {
        askQuestion();
    }, 500);
}

function addBotMessage(text, isLoading = false) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message message-bot";

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-bot";
    avatar.textContent = "🤖";

    const content = document.createElement("div");
    content.className = "message-content";

    if (isLoading) {
        content.innerHTML =
            text +
            '<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>';
        content.id = "loadingMessage";
    } else {
        content.textContent = text;
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    scrollToBottom();
}

function addUserMessage(text) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message message-user";

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-user";
    avatar.textContent = "👤";

    const content = document.createElement("div");
    content.className = "message-content";
    content.textContent = text;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    scrollToBottom();
}

function askQuestion() {
    if (currentQuestion < questions.length) {
        const question = questions[currentQuestion];
        addBotMessage(
            `[${currentQuestion + 1}/${questions.length}] ${question.text}`
        );
    }
}

function answer(userAnswer) {
    const question = questions[currentQuestion];

    addUserMessage(userAnswer);

    answersLog.push({
        question_id: question.id,
        theme_category: question.category,
        question_text: question.text,
        user_answer: userAnswer,
    });

    currentQuestion++;

    setTimeout(() => {
        if (currentQuestion < questions.length) {
            askQuestion();
        } else {
            finishGame();
        }
    }, 500);
}

function removeLoadingMessage() {
    const loadingMessageElement = document.getElementById("loadingMessage");
    if (loadingMessageElement) {
        loadingMessageElement.parentElement.remove();
    }
}

function scrollToBottom() {
    const chatMessages = document.getElementById("chatMessages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function restartGame() {
    sessionStorage.removeItem("foodList");
    location.reload();
}

// =================================================================
//                    핵심: Gemini API 요청 로직
// =================================================================

/**
 * 사용자 답변 로그를 바탕으로 Gemini API에 음식 추천을 요청합니다.
 */
async function getFoodRecommendation(answersLog) {
    // 1. 답변을 프롬프트로 변환
    const prompt = `
        다음은 사용자의 음식 선호도에 대한 10가지 답변입니다:
        ${answersLog
            .map((a) => `- ${a.question_text}: ${a.user_answer}`)
            .join("\n")}
        
        위 답변을 바탕으로 사용자가 실제로 한국에서 구입·먹을 수 있는 음식 4개를 추천해주세요.  
        너무 생소하여 한국 내 유통/판매가 거의 없는 해외 음식(예: 특이 현지 요리, 지역 한정 메뉴 등)은 포함하지 마세요.  


        각 음식은 위키피디아에 정의되어 있는 정확한 음식명이여야 하며,  
        추천 음식 예시: 스파게티, 순대국, 감바스 알 아히요 와 같이 원본이 되는 음식명만 사용하세요.  
        베이컨 크림 파스타 등의 바리에이션이 들어간 음식은 안됩니다.  
        응답은 반드시 아래의 JSON 배열 구조만으로 출력하세요.  
        다른 부가 설명 및 텍스트는 절대 추가하지 마세요.  


        [{"name": "음식1", "description": "설명1"}, {"name": "음식2", "description": "설명2"}, ...]
    `.trim();

    // 2. Gemini API 요청
    const response = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "API 요청 실패");
    }

    const data = await response.json();

    try {
        const jsonText = data.candidates[0].content.parts[0].text;
        return JSON.parse(jsonText);
    } catch (e) {
        console.error("JSON 파싱 오류:", data);
        throw new Error("Gemini 응답 형식이 올바르지 않습니다.");
    }
}

// =================================================================
//                    위키피디아 이미지 로딩 함수 (추가)
// =================================================================

/**
 * 위키피디아 API를 사용하여 음식 이름의 대표 이미지 URL을 가져옵니다.
 */
async function getWikipediaImageUrl(foodName) {
    const WIKI_API_BASE = "https://ko.wikipedia.org/w/api.php";

    // 플레이스홀더 서비스 변경 및 URL 인코딩 수정
    const encodedFoodName = encodeURIComponent(foodName.replace(/ /g, "+"));
    const PLACEHOLDER_URL = `https://placehold.co/200x200/f0f0f0/666666?text=${encodedFoodName}`;

    const step1Params = new URLSearchParams({
        action: "query",
        titles: foodName,
        prop: "pageimages",
        piprop: "original",
        format: "json",
        redirects: 1,
        origin: "*",
    });

    try {
        const step1Response = await fetch(
            `${WIKI_API_BASE}?${step1Params.toString()}`
        );
        if (!step1Response.ok) return PLACEHOLDER_URL;

        const step1Data = await step1Response.json();
        const pages = step1Data.query.pages;
        const pageId = Object.keys(pages)[0];

        if (
            pageId === "-1" ||
            !pages[pageId].original ||
            !pages[pageId].original.source
        ) {
            return PLACEHOLDER_URL;
        }

        return pages[pageId].original.source;
    } catch (error) {
        console.error(`Wikipedia 이미지 요청 오류 for ${foodName}:`, error);
        return PLACEHOLDER_URL;
    }
}

// =================================================================
//                    게임 종료 및 결과 준비 함수 (수정)
// =================================================================

async function finishGame() {
    document.getElementById("chatInput").style.display = "none";

    addBotMessage("모든 질문에 답변해주셔서 감사합니다! 😊");

    setTimeout(() => {
        addBotMessage("취향을 분석하고 있습니다", true);
    }, 800);

    try {
        // API 요청 및 결과 대기
        const recommendationResults = await getFoodRecommendation(answersLog);
        // 로딩 메시지 제거
        removeLoadingMessage();

        const foodListArray = recommendationResults.map((item) => item.name);
        
        const foodListObject = {
            food_list: foodListArray
        };
        
        sessionStorage.setItem("foodList", JSON.stringify(foodListObject));
        
        console.log("세션 스토리지에 저장된 객체:", foodListObject);
        
        // ==========================================================

        // 결과 표시
        addBotMessage("분석이 완료되었습니다! 🎉");

        setTimeout(async () => {
            addBotMessage("당신의 취향에 맞는 음식 추천 결과입니다:");
            await addResultCards(recommendationResults); 
        }, 800);
    } catch (error) {
        console.error("API 요청 실패:", error);
        removeLoadingMessage();
        addBotMessage(
            `죄송합니다. 오류가 발생했습니다: ${error.message}. 다시 시도해주세요.`
        );
        showRestartButton();
    }
}

// =================================================================
//                            결과 표시 함수 (수정)
// =================================================================

/**
 * 💡 이 함수는 비동기 함수로 변경되었으며, 이미지 로딩 로직이 통합되었습니다.
 */
async function addResultCards(results) {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message message-bot";

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-bot";
    avatar.textContent = "🤖";

    const content = document.createElement("div");
    content.className = "message-content";
    content.style.maxWidth = "90%";

    const cardsContainer = document.createElement("div");
    cardsContainer.className = "result-cards";

    // 1. 모든 이미지 URL을 비동기적으로 동시에 가져와서 결과를 업데이트합니다.
    const resultsWithImages = await Promise.all(
        results.map(async (result) => {
            const imageUrl = await getWikipediaImageUrl(result.name);
            return { ...result, imageUrl }; // imageUrl을 추가하여 반환
        })
    );

    // 2. 이미지가 포함된 데이터로 최종 HTML을 구성하고 DOM에 삽입합니다.
    resultsWithImages.forEach((result) => {
        const card = document.createElement("div");
        card.className = "result-card";

        // CSS 구조에 맞게 이미지와 텍스트를 분리하여 HTML 구성
        card.innerHTML = `
    <div class="result-card-content">
        <div 
            class="result-card-image-box" 
            style="background-image: url('${result.imageUrl}');"
            alt="${result.name} 이미지" 
            loading="lazy"
        >
            </div>
        <div class="result-card-text">
            <h3>${result.name}</h3>
            <p>${result.description}</p>
        </div>
    </div>
`;
        cardsContainer.appendChild(card);
    });

    content.appendChild(cardsContainer);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    scrollToBottom();

    setTimeout(() => {
        showRestartButton();
    }, 500);
}

function showRestartButton() {
    const chatMessages = document.getElementById("chatMessages");
    const messageDiv = document.createElement("div");
    messageDiv.className = "chat-message message-bot";

    const avatar = document.createElement("div");
    avatar.className = "avatar avatar-bot";
    avatar.textContent = "🤖";

    const content = document.createElement("div");
    content.className = "message-content";
    content.innerHTML = `
        <p style="margin-bottom: 12px;">다시 추천받으시겠어요?</p>
        <button class="btn btn-start" onclick="restartGame()" style="padding: 8px 25px; font-size: 0.95em;">
            다시 시작하기
        </button>
        <button class="btn btn-movePage" onclick="window.location.href='search.html'" style="padding: 8px 25px; font-size: 0.95em;">
            자세히 보기
        </button>
    `;

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    chatMessages.appendChild(messageDiv);

    scrollToBottom();
}

async function fetchAndRenderDayTripPlans() {
    const carouselTrack = document.getElementById("carouselTrack");
    const cardTemplate = document.getElementById("cardTemplate");
    const placeholderTemplate = document.getElementById("placeholderCardTemplate");

    carouselTrack.innerHTML = "";

    try {
        const response = await fetch("http://localhost:3000/plans");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allPlans = await response.json();
        const dayTripPlans = allPlans.filter(plan => plan.is_day_trip === true);

        dayTripPlans.forEach((plan) => {
            //true를 넣어 자식 요소까지 모두 복제
            const cardClone = cardTemplate.content.cloneNode(true);

            cardClone.querySelector(".card-region").textContent = `${plan.region} (당일치기)`;
            cardClone.querySelector(".card-date").textContent = plan.start_date;
            cardClone.querySelector(".card-meta").textContent = `인원: ${plan.size}명`;
            
            const firstPlaceName = plan.plan_items?.[0]?.places?.name || "일정 없음";
            cardClone.querySelector(".card-place").textContent = `첫 일정: ${firstPlaceName}`;

            carouselTrack.appendChild(cardClone);
        });

        // DB에 있는 is_day_trip이 TRUE인 값이 4개가 되지 않을 경우 채우는 부분
        const placeholdersNeeded = 4 - dayTripPlans.length;
        if (placeholdersNeeded > 0) {
            for (let i = 0; i < placeholdersNeeded; i++) {
                const placeholderClone = placeholderTemplate.content.cloneNode(true);
                carouselTrack.appendChild(placeholderClone);
            }
        }

    } catch (error) {
        console.error("당일치기 계획 데이터를 가져오는 중 오류 발생: ", error);
        carouselTrack.innerHTML =
            '<div class="carousel-card">데이터 로딩 중 오류가 발생했습니다.</div>';
    }
}

document.addEventListener("DOMContentLoaded", () => {
    fetchAndRenderDayTripPlans();
});