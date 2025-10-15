const planGrid = document.getElementById("planGrid");

async function fetchPlans() {
  try {
      // Express 서버의 /plans 엔드포인트로 요청
      const response = await fetch("http://localhost:3000/plans"); 
      
      if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const plansData = await response.json();
      return plansData;

  } catch (error) {
      console.error("Express 서버에서 데이터를 가져오는 중 오류 발생: ", error);
      return null;
  }
}

const renderPlans = (plansData) => {
  if (!planGrid) return;
  planGrid.innerHTML = ""; // 기존 내용 초기화

  plansData.forEach((plan) => {
    const isDayTrip = plan.start_date === plan.end_date;
    const durationText = isDayTrip
      ? "당일치기"
      : `${plan.start_date} ~ ${plan.end_date}`;

    const cardTitle = `${plan.region} (${isDayTrip ? "당일" : "다일정"})`;

    const cardHtml = `
          <div class="plan-card">
            <div class="plan-card-body">
              <h3 class="plan-card-title">${cardTitle}</h3> 
              <p class="plan-card-meta">
                🗓️ 기간: ${durationText}
              </p>
              <p class="plan-card-meta">
                📍 지역: ${plan.region} 
                <span style="color: ${
                  isDayTrip ? "#555" : "#BB2637"
                }; font-weight: 500;">
                  
                </span>
              </p>
              <p class="plan-card-meta">👨‍👩‍👧‍👦 인원: ${plan.size}명</p>
              
              <div class="plan-actions">
                <button 
                  data-plan-id="${plan.plan_id}" 
                  class="view-reviews-button"
                >
                  리뷰 보기 🔍
                </button>
              
                <button 
                  data-plan-id="${plan.plan_id}" 
                  class="create-review-button"
                >
                  리뷰 작성 ✍️
                </button>
              </div>
            </div>
          </div>
        `;

    planGrid.insertAdjacentHTML("beforeend", cardHtml);
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  const plansData = await fetchPlans();

  if (plansData) {
    renderPlans(plansData);
  }
});
