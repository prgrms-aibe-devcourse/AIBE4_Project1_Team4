const planGrid = document.getElementById("planGrid");

const modalContainer = document.getElementById("reviewModalContainer");
const closeModalButton = document.getElementById("closeModalButton");
const reviewRatingStars = document.querySelectorAll("#reviewRating .star");
let selectedRating = 0;
const submitReviewButton = document.getElementById("submitReviewButton");
const reviewContent = document.getElementById("reviewContent");
const reviewsListModalContainer = document.getElementById(
  "reviewsListModalContainer"
);
const closeReviewsListModalButton = document.getElementById(
  "closeReviewsListModalButton"
);
const reviewsList = document.getElementById("reviewsList");
const noReviewsMessage = document.getElementById("noReviewsMessage");

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
  planGrid.innerHTML = "";

  plansData.forEach((plan) => {
    const isDayTrip = plan.start_date === plan.end_date;
    const durationText = isDayTrip
      ? "당일치기"
      : `${plan.start_date} ~ ${plan.end_date}`;

    const mainPlacesNames = plan.plan_items
      .map((item) => {
        let placeData = item.places;
        if (Array.isArray(placeData) && placeData.length > 0) {
          placeData = placeData[0];
        }
        return placeData && placeData.name ? placeData.name : null;
      })
      .filter((name) => name)
      .slice(0, 5)
      .join(", ");

    const mainPlacesText =
      mainPlacesNames.length > 0
        ? `방문 장소: ${mainPlacesNames}`
        : `방문 장소: (장소 정보 없음)`;

    const mainPlacesContent =
      mainPlacesNames.length > 0 ? mainPlacesNames : `(장소 정보 없음)`;

    const cardTitle = `${plan.region} 여행 (${isDayTrip ? "당일" : "다일정"})`;

    const cardHtml = `
          <div class="plan-card">
            <div class="plan-card-body">
              <h3 class="plan-card-title">${cardTitle}</h3> 
              <p class="plan-card-meta">
                <img src="img/icon/icon-calendar.png" alt="기간" class="meta-icon" /> 기간: ${durationText}
              </p>
              <p class="plan-card-meta">
                <img src="img/icon/icon-location.png" alt="지역" class="meta-icon" /> 지역: ${
                  plan.region
                }
                <span style="color: ${
                  isDayTrip ? "#555" : "#BB2637"
                }; font-weight: 500;">
                  
                </span>
              </p>
              <p class="plan-card-meta">
                <img src="img/icon/icon-user.png" alt="인원" class="meta-icon" /> 인원: ${
                  plan.size
                }명
              </p></p>

              <div class="plan-card-places"> 
                  <img src="img/icon/icon-map.png" alt="장소" class="meta-icon" />
                  <span class="places-label">방문 장소 : </span>
                  <span class="places-content">${mainPlacesContent}</span>
              </div>
            
              <div class="plan-actions">
                  <button 
                    data-plan-id="${plan.plan_id}" 
                    class="view-reviews-button action-button gray-button" 
                  >
                    리뷰 보기 </button>
                  <button 
                    data-plan-id="${plan.plan_id}" 
                    class="create-review-button action-button red-button" 
                  >
                    리뷰 작성 </button>
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

  if (planGrid) {
    planGrid.addEventListener("click", handlePlanAction);
  }

  if (closeModalButton) {
    closeModalButton.addEventListener("click", closeReviewModal);
  }

  if (modalContainer) {
    modalContainer.addEventListener("click", (e) => {
      if (e.target === modalContainer) {
        closeReviewModal();
      }
    });
  }

  if (submitReviewButton) {
    submitReviewButton.addEventListener("click", submitReview);
  }

  if (reviewsListModalContainer) {
    reviewsListModalContainer.addEventListener("click", (e) => {
      if (e.target === reviewsListModalContainer) {
        closeReviewsListModal();
      }
    });
  }

  if (closeReviewsListModalButton) {
    closeReviewsListModalButton.addEventListener(
      "click",
      closeReviewsListModal
    );
  }
});

function handlePlanAction(event) {
  const button = event.target.closest(
    ".create-review-button, .view-reviews-button"
  );

  if (!button) {
    return;
  }

  const planId = button.dataset.planId;

  if (button.classList.contains("create-review-button")) {
    console.log("리뷰 작성 버튼 클릭. Plan ID: ${planId}");
    openReviewModal(planId);
  } else if (button.classList.contains("view-reviews-button")) {
    console.log("리뷰 보기 버튼 클릭. Plan ID: ${planId}");
    fetchAndDisplayReviews(planId);
  }
}

function openReviewModal(planId) {
  if (!modalContainer) {
    console.error("리뷰 모달 컨테이너를 찾을 수 없습니다.");
    return;
  }

  modalContainer.classList.remove("hidden");

  modalContainer.dataset.currentPlanId = planId;

  document.body.style.overflow = "hidden";

  selectedRating = 0;
  highlightStars(0);
  document.getElementById("reviewContent").value = "";
}

function closeReviewModal() {
  if (modalContainer) {
    modalContainer.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
}

reviewRatingStars.forEach((star) => {
  star.addEventListener("click", () => {
    const rating = parseInt(star.dataset.rating);
    selectedRating = rating;
    highlightStars(rating);
  });

  star.addEventListener("mouseover", () => {
    const rating = parseInt(star.dataset.rating);
    highlightStars(rating);
  });

  star.addEventListener("mouseout", () => {
    highlightStars(selectedRating);
  });
});

function highlightStars(rating) {
  reviewRatingStars.forEach((star) => {
    if (parseInt(star.dataset.rating) <= rating) {
      star.src = "img/icon/icon-fork-red.png";
    } else {
      star.src = "img/icon/icon-fork-gray.png";
    }
  });
}

async function submitReview() {
  const planId = modalContainer.dataset.currentPlanId;
  const content = reviewContent.value.trim();

  if (content.length < 5) {
    alert("리뷰 내용은 5자 이상 입력해야 합니다.");
    return;
  }

  const reviewData = {
    plan_id: planId,
    review_rating: selectedRating,
    review: content,
  };
  try {
    const response = await fetch("http://localhost:3000/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reviewData),
    });
    if (!response.ok) {
      throw new Error("리뷰 저장에 실패했습니다.");
    }
    const result = await response.json();
    console.log("리뷰 저장 성공", result);

    alert("리뷰가 성공적으로 저장되었습니다.");
    closeReviewModal();
  } catch (error) {
    console.error("리뷰 저장 중 오류 발생", error);
    alert(error.message);
  }
}

function closeReviewsListModal() {
  if (reviewsListModalContainer) {
    reviewsListModalContainer.classList.add("hidden");
    document.body.style.overflow = "auto";
  }
}

function renderReviewCards(reviews) {
  if (reviews.length === 0) {
    reviewsList.innerHTML = "";
    noReviewsMessage.classList.remove("hidden");
    return;
  }

  noReviewsMessage.classList.add("hidden");

  const reviewCardsHtml = reviews
    .map((review) => {
      const rating = review.review_rating || 0;
      let starsHtml = "";
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<img src="img/icon/icon-fork-${
          i <= rating ? "red" : "gray"
        }.png" class="review-display-star" alt="${i}점" />`;
      }

      const date = new Date(review.created_at);
      const dateString = date.toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const content = review.review || "내용 없음";

      return `
          <div class="review-card">
              <div class="review-header">
                  <span class="review-date">${dateString}</span>
              </div>
              
              <span class="review-rating-display">${starsHtml}</span>
              
              <p class="review-content">${content}</p>
          </div>
      `;
    })
    .join("");

  reviewsList.innerHTML = reviewCardsHtml;
}

async function fetchAndDisplayReviews(planId) {
  if (!reviewsListModalContainer) {
    console.error("리뷰 목록 모달 컨테이너를 찾을 수 없습니다.");
    return;
  }

  try {
    reviewsList.innerHTML = `<div class="no-reviews-message">리뷰를 불러오는 중...</div>`;
    reviewsListModalContainer.classList.remove("hidden");
    document.body.style.overflow = "hidden";

    const response = await fetch(`http://localhost:3000/reviews/${planId}`);

    if (!response.ok) {
      throw new Error("리뷰 목록을 불러오는 데 실패했습니다.");
    }

    const reviews = await response.json();

    const plansData = await fetchPlans();
    const currentPlan = plansData
      ? plansData.find((p) => p.plan_id === planId)
      : null;
    document.getElementById("reviewsTitlePlanName").textContent = currentPlan
      ? currentPlan.region
      : "선택된 계획";

    renderReviewCards(reviews);
  } catch (error) {
    console.error("리뷰 조회 중 오류 발생:", error);
    alert(error.message);
    closeReviewsListModal();
  }
}
