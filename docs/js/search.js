// --- API 관련 변수 ---
const GEMINI_API_KEY = "AIzaSyCyurgOODnY2koKUDFL9GoyM9iAjv7BZWo"; // 중요: 여기에 본인의 Gemini API 키를 입력하세요.
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

const searchBtn = document.getElementById("searchBtn");
const loadingIndicator = document.getElementById("loading");
const suggestWrapper = document.getElementById("suggestWrapper");
const decreaseBtn = document.getElementById("decreaseBtn");
const increaseBtn = document.getElementById("increaseBtn");
const peopleCountInput = document.getElementById("peopleCountInput");

increaseBtn.addEventListener("click", () => {
  let currentValue = parseInt(peopleCountInput.value, 10) || 0;
  peopleCountInput.value = currentValue + 1;
});
decreaseBtn.addEventListener("click", () => {
  let currentValue = parseInt(peopleCountInput.value, 10) || 1;
  if (currentValue > 1) {
    peopleCountInput.value = currentValue - 1;
  }
});

// --- AI 추천 검색 이벤트 리스너 ---
searchBtn.addEventListener("click", async () => {
  const likedFoodsRaw = sessionStorage.getItem("foodList");
  let preferredFoodsString = "없음";
  if (likedFoodsRaw) {
    try {
      const likedFoods = JSON.parse(likedFoodsRaw);
      if (Array.isArray(likedFoods) && likedFoods.length > 0) {
        preferredFoodsString = likedFoods.join(", ");
      }
    } catch (e) {
      console.error("선호 음식 데이터 파싱 실패:", e);
    }
  }
  const region = document.getElementById("regionInput").value;
  const trip_start_date = document.getElementById("tripStartDate").value;
  const trip_end_date = document.getElementById("tripEndDate").value;
  const peopleCount = peopleCountInput.value;
  const includeSightseeing = document.getElementById("sightCheckbox").checked;
  if (!region || !trip_start_date || !trip_end_date || !peopleCount) {
    alert("모든 정보를 입력해주세요.");
    return;
  }
  const userData = {
    region,
    trip_start_date,
    trip_end_date,
    number_of_people: parseInt(peopleCount, 10),
    sight: includeSightseeing,
  };
  loadingIndicator.style.display = "block";
  suggestWrapper.style.display = "none";
  try {
    const prompt = `
            여행객 정보를 바탕으로, 여행지 내 여행 계획을 **반드시 3가지 버전**으로 추천해줘.
            각 계획은 전체 여행 기간에 맞춰 일자별로 방문할 장소 목록을 포함해야 해.
            각 장소에 대한 정보는 다음 규칙을 반드시 따라야 해:
            1. 'plan_title': 계획의 제목
            2. 'summary': 계획의 한 줄 요약
            3. 'places': 방문 장소 목록 (visit_date, visit_time, name, address, price, rating 포함)
            'sight'가 true이면 식당과 관광지를 섞고, false이면 식당 위주로 짜줘.
            아침, 점심, 저녁 식사는 필수로 포함해주고, 아래 '선호 음식'이 있다면 식당 추천에 적극 반영해줘.
            여행 정보:
            - 여행 지역: ${userData.region}
            - 시작일: ${userData.trip_start_date}
            - 종료일: ${userData.trip_end_date}
            - 인원: ${userData.number_of_people}
            - 관광지 추천 여부: ${userData.sight}
            - 선호 음식: ${preferredFoodsString}
            반드시 아래 JSON 스키마 형식에 맞춰서 한국어로 답변해줘.
          `;
    const generationConfig = {
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          plans: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                plan_title: { type: "STRING" },
                summary: { type: "STRING" },
                places: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      visit_date: { type: "STRING" },
                      visit_time: { type: "STRING" },
                      name: { type: "STRING" },
                      address: { type: "STRING" },
                      price: { type: "NUMBER" },
                      rating: { type: "NUMBER" },
                    },
                    required: [
                      "visit_date",
                      "visit_time",
                      "name",
                      "address",
                      "price",
                      "rating",
                    ],
                  },
                },
              },
              required: ["plan_title", "summary", "places"],
            },
          },
        },
        required: ["plans"],
      },
    };
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig,
    };
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`API 호출 실패: ${response.statusText}`);
    const result = await response.json();
    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);
      if (aiResponse.plans && aiResponse.plans.length > 0) {
        renderPlans(aiResponse.plans, userData);
      } else {
        throw new Error("AI가 유효한 계획을 반환하지 않았습니다.");
      }
    } else {
      console.error("Unexpected API response structure:", result);
      alert("여행 계획 생성에 실패했습니다. 응답 형식이 올바르지 않습니다.");
    }
  } catch (error) {
    console.error("Error:", error);
    alert(`여행 계획 생성 중 오류가 발생했습니다: ${error.message}`);
  } finally {
    loadingIndicator.style.display = "none";
  }
});

function renderPlans(plans, userData) {
  const tempPlans = plans.map((plan) => ({
    plan_title: plan.plan_title,
    summary: plan.summary,
    start_date: userData.trip_start_date,
    end_date: userData.trip_end_date,
    region: userData.region,
    size: userData.number_of_people,
    places: plan.places,
  }));
  sessionStorage.setItem("tempPlans", JSON.stringify(tempPlans));
  displayPlans(tempPlans);
}

function displayPlans(plansToDisplay) {
  const planContainers = document.querySelectorAll(".plan-container");
  plansToDisplay.forEach((plan, index) => {
    const container = planContainers[index];
    if (!container) return;

    const planTitleHeader = container.querySelector(".plan-title-header");
    const slider = container.querySelector(".slider");
    const planSummaryText = container.querySelector(".plan-summary-text");
    const detailsBtn = container.querySelector(".details-btn");

    planTitleHeader.textContent = `계획 ${index + 1}: ${plan.plan_title}`;
    planSummaryText.textContent = plan.summary;
    slider.innerHTML = ""; // 슬라이더 초기화

    // '자세히 보기' 버튼에 해당 plan 전체 데이터 저장
    detailsBtn.dataset.plan = JSON.stringify(plan);

    const placesByDate = plan.places.reduce((acc, place) => {
      const date = place.visit_date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(place);
      return acc;
    }, {});

    Object.keys(placesByDate)
      .sort()
      .forEach((date) => {
        const dayCard = document.createElement("div");
        dayCard.className = "day-card";
        let dailyPlansHtml = `<h4>${date}</h4><ul>`;
        const sortedPlaces = placesByDate[date].sort((a, b) =>
          a.visit_time.localeCompare(b.visit_time)
        );
        sortedPlaces.forEach((place) => {
          dailyPlansHtml += `<li>${place.visit_time} - ${place.name}</li>`;
        });
        dailyPlansHtml += "</ul>";
        dayCard.innerHTML = dailyPlansHtml;
        slider.appendChild(dayCard);
      });
    setupCarousel(container);
  });

  suggestWrapper.style.display = "block";
}

function setupCarousel(containerElement) {
  const slider = containerElement.querySelector(".slider");
  const prevBtn = containerElement.querySelector(".prev-btn");
  const nextBtn = containerElement.querySelector(".next-btn");
  const dayCards = containerElement.querySelectorAll(".day-card");

  let currentIndex = 0;
  const totalCards = dayCards.length;
  const visibleCards = 3;

  if (totalCards <= visibleCards) {
    prevBtn.style.display = "none";
    nextBtn.style.display = "none";
    return;
  }

  prevBtn.style.display = "block";
  nextBtn.style.display = "block";

  function updateCarousel() {
    const offset = -currentIndex * (100 / visibleCards);
    slider.style.transform = `translateX(${offset}%)`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex >= totalCards - visibleCards;
  }

  nextBtn.addEventListener("click", () => {
    if (currentIndex < totalCards - visibleCards) {
      currentIndex++;
      updateCarousel();
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentIndex > 0) {
      currentIndex--;
      updateCarousel();
    }
  });
  updateCarousel();
}

document.addEventListener("DOMContentLoaded", () => {
  const storedPlansRaw = sessionStorage.getItem("tempPlans");
  if (storedPlansRaw) {
    try {
      const storedPlans = JSON.parse(storedPlansRaw);
      if (Array.isArray(storedPlans) && storedPlans.length > 0) {
        displayPlans(storedPlans);
      }
    } catch (e) {
      console.error("세션 스토리지 데이터 파싱 실패:", e);
      sessionStorage.removeItem("tempPlans");
    }
  }
});

// '자세히 보기' 버튼에 대한 이벤트 리스너 (이벤트 위임)
suggestWrapper.addEventListener("click", function (event) {
  if (event.target.classList.contains("details-btn")) {
    const planData = event.target.dataset.plan;
    if (planData) {
      sessionStorage.setItem("plansData", planData);
      window.location.href = "schedule.html";
    }
  }
});
