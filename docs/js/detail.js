const mockPlans = [
  {
    plan_id: "p-001",
    region: "강릉",
    start_date: "2025-10-14",
    end_date: "2025-10-14" /* 당일치기 */,
    size: 2,
  },
  {
    plan_id: "p-002",
    region: "제주도",
    start_date: "2025-11-01",
    end_date: "2025-11-03",
    size: 4,
  },
  {
    plan_id: "p-003",
    region: "부산",
    start_date: "2025-12-24",
    end_date: "2025-12-25",
    size: 1,
  },
];
const renderPlans = () => {
  planGrid.innerHTML = ""; // 기존 내용 초기화

  mockPlans.forEach((plan) => {
    const isDayTrip = plan.start_date === plan.end_date;
    const durationText = isDayTrip
      ? "당일치기"
      : `${plan.start_date} ~ ${plan.end_date}`;

    const cardTitle = `${plan.region} (${isDayTrip ? "당일" : "다일정"})`;

    const cardHtml = `
        <div class="plan-card">
          <div class="plan-card-body">
            <h3 class="plan-card-title">${cardTitle}</h3> <p class="plan-card-meta">
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
            
            <button 
              data-plan-id="${plan.plan_id}" 
              class="review-button"
            >
              리뷰 작성
            </button>
          </div>
        </div>
      `;

    planGrid.insertAdjacentHTML("beforeend", cardHtml);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  renderPlans();
});
