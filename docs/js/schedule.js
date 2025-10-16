// 임시 여행 계획 데이터.
// 나중에 search 페이지에서 전달받은 데이터로 수정한다.
const plansData = {
  start_date: "2025-10-15",
  end_date: "2025-10-17",
  region: "부산",
  size: 1,
  places: [
    {
      visit_date: "2025-10-15",
      visit_time: "12:00",
      name: "본전돼지국밥",
      address: "부산광역시 동구 중앙대로214번길 3-8",
      price: 1,
      rating: 4.2,
    },
    {
      visit_date: "2025-10-15",
      visit_time: "15:00",
      name: "원조 승기 씨앗 호떡",
      address: "부산광역시 중구 비프광장로 36",
      price: 0,
      rating: 4.3,
    },
    {
      visit_date: "2025-10-15",
      visit_time: "18:00",
      name: "자갈치시장",
      address: "부산광역시 중구 자갈치해안로 52",
      price: 2,
      rating: 4.4,
    },
    {
      visit_date: "2025-10-16",
      visit_time: "13:00",
      name: "가야밀면",
      address: "부산광역시 부산진구 가야대로 544-1",
      price: 1,
      rating: 4.3,
    },
    {
      visit_date: "2025-10-16",
      visit_time: "19:00",
      name: "문화양곱창",
      address: "부산광역시 부산진구 가야대로784번길 62",
      price: 3,
      rating: 4.1,
    },
    {
      visit_date: "2025-10-17",
      visit_time: "12:30",
      name: "수변최고돼지국밥 민락본점",
      address: "부산광역시 수영구 광안해변로370번길 9-32",
      price: 1,
      rating: 4.6,
    },
    {
      visit_date: "2025-10-17",
      visit_time: "18:30",
      name: "해운대기와집 대구탕",
      address: "부산광역시 해운대구 달맞이길104번길 46",
      price: 2,
      rating: 4.6,
    },
  ],
};

const headerContainer = document.querySelector("#main-header");
const mainContainer = document.querySelector("#main-content");
const footerContainer = document.querySelector("#main-footer");
let currentDay = 1;

const getUniqueDates = () => {
  const dates = [...new Set(plansData.places.map((place) => place.visit_date))];
  return dates.sort();
};

const getDayNumber = (visitDate) => {
  const uniqueDates = getUniqueDates();
  return uniqueDates.indexOf(visitDate) + 1;
};

const sortPlacesByTime = () => {
  plansData.places.sort((a, b) => {
    if (a.visit_date !== b.visit_date) {
      return a.visit_date.localeCompare(b.visit_date);
    }
    return a.visit_time.localeCompare(b.visit_time);
  });
};

const validateTime = (timeStr) => {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  return timeRegex.test(timeStr);
};

const autoCorrectTime = (timeStr) => {
  timeStr = timeStr.replace(/[^0-9:]/g, "");
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    let hours = parseInt(parts[0], 10);
    let minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || hours < 0) hours = 0;
    if (hours > 23) hours = 23;
    if (isNaN(minutes) || minutes < 0) minutes = 0;
    if (minutes > 59) minutes = 59;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }
  return "12:00";
};

let uniqueDates = getUniqueDates();
let days = uniqueDates.length;
sortPlacesByTime();

const renderSchedule = () => {
  headerContainer.innerHTML = "";
  mainContainer.innerHTML = "";
  footerContainer.innerHTML = "";

  const headerDiv = document.createElement("div");
  headerDiv.className = "trip-header";
  headerDiv.innerHTML = `
    <h1>${plansData.region}</h1>
    <div class="trip-meta">
       <span class="trip-dates">${plansData.start_date} ~ ${plansData.end_date}</span>
    </div>
  `;
  headerContainer.appendChild(headerDiv);

  const mainContentWrapper = document.createElement("div");
  mainContentWrapper.className = "schedule-container";

  const dayTabs = document.createElement("div");
  dayTabs.className = "day-tabs";
  for (let i = 1; i <= days; i++) {
    const tab = document.createElement("button");
    tab.className = `day-tab ${i === currentDay ? "active" : ""}`;
    tab.textContent = `Day ${i}`;
    tab.addEventListener("click", () => {
      currentDay = i;
      renderSchedule();
    });
    dayTabs.appendChild(tab);
  }
  mainContentWrapper.appendChild(dayTabs);

  // Google Map API와 연동하여 지도와 경로를 시각화하는 작업은 나중에 진행한다.
  const currentDayPlaces = plansData.places.filter(
    (place) => getDayNumber(place.visit_date) === currentDay
  );
  const mapDiv = document.createElement("div");
  mapDiv.className = "map-container";
  mapDiv.innerHTML = `<div class="map-placeholder">${currentDayPlaces.length}개 장소</div>`;
  mainContentWrapper.appendChild(mapDiv);

  const sectionTitle = document.createElement("div");
  sectionTitle.className = "section-title";
  sectionTitle.textContent = "일정 상세";
  mainContentWrapper.appendChild(sectionTitle);

  let displayIndex = 1;
  plansData.places.forEach((place, index) => {
    if (getDayNumber(place.visit_date) !== currentDay) {
      return;
    }

    const placeDiv = document.createElement("div");
    placeDiv.className = "place";
    placeDiv.setAttribute("data-id", index);

    if (place.isEditing) {
      placeDiv.innerHTML = `
        <div class="place-identifier">
            <div class="place-number">${displayIndex}</div>
            <input type="text" class="edit-time" value="${place.visit_time}">
        </div>
        <div class="place-content">
            <div class="place-information">
                <input type="text" class="edit-place-name" value="${
                  place.name
                }" maxlength="100">
                <input type="text" class="edit-address" value="${
                  place.address
                }" maxlength="100">
                <div class="rating-editor">
                  <input type="number" class="edit-rating" value="${place.rating.toFixed(
                    1
                  )}" min="0" max="5" step="0.1">
                  <span>/ 5.0</span>
                </div>
                <div class="price-selector" data-price="${place.price}">
                    <button class="price-option" data-value="0">$</button>
                    <button class="price-option" data-value="1">$$</button>
                    <button class="price-option" data-value="2">$$$</button>
                    <button class="price-option" data-value="3">$$$$</button>
                    <button class="price-option" data-value="4">$$$$$</button>
                </div>
            </div>
            <div class="place-actions">
                <div class="action-buttons">
                    <button class="save-btn"><img src="./img/icon/icon-check.png" width=24px/></button>
                    <button class="cancel-btn"><img src="./img/icon/icon-cancel.png" width=24px/></button>
                </div>
            </div>
        </div>
      `;

      const priceSelector = placeDiv.querySelector(".price-selector");
      priceSelector
        .querySelector(`[data-value="${place.price}"]`)
        .classList.add("selected");
      priceSelector.addEventListener("click", (e) => {
        if (e.target.classList.contains("price-option")) {
          priceSelector
            .querySelectorAll(".price-option")
            .forEach((btn) => btn.classList.remove("selected"));
          e.target.classList.add("selected");
          priceSelector.dataset.price = e.target.dataset.value;
        }
      });

      placeDiv.querySelector(".save-btn").addEventListener("click", () => {
        let newTime = placeDiv.querySelector(".edit-time").value;
        if (!validateTime(newTime)) {
          newTime = autoCorrectTime(newTime);
        }

        let newRating = parseFloat(
          placeDiv.querySelector(".edit-rating").value
        );
        if (isNaN(newRating) || newRating < 0) newRating = 0;
        if (newRating > 5) newRating = 5;

        plansData.places[index].visit_time = newTime;
        plansData.places[index].name =
          placeDiv.querySelector(".edit-place-name").value;
        plansData.places[index].address =
          placeDiv.querySelector(".edit-address").value;
        plansData.places[index].rating = newRating;
        plansData.places[index].price = parseInt(
          priceSelector.dataset.price,
          10
        );

        delete plansData.places[index].isEditing;
        sortPlacesByTime();
        renderSchedule();
      });

      placeDiv.querySelector(".cancel-btn").addEventListener("click", () => {
        delete plansData.places[index].isEditing;
        renderSchedule();
      });
    } else {
      const fullStars = Math.floor(place.rating);
      const hasHalfStar = place.rating % 1 >= 0.5;
      let starsHtml = "★".repeat(fullStars);
      if (hasHalfStar) starsHtml += "☆";
      starsHtml += "☆".repeat(5 - fullStars - (hasHalfStar ? 1 : 0));
      const priceSymbol = "$".repeat(place.price + 1);

      placeDiv.innerHTML = `
        <div class="place-identifier">
            <div class="place-number">${displayIndex}</div>
            <div class="place-time">${place.visit_time}</div>
        </div>
        <div class="place-content">
            <div class="place-information">
            <h3 class="place-name">
                ${place.name}
            </h3>
            <p class="place-address">${place.address}</p>
            <div class="place-rating">
                <span class="stars">${starsHtml}</span>
                <span class="rating-value">${place.rating.toFixed(1)}</span>
            </div>
            <div class="price-info">
                <span class="price-indicator">${priceSymbol}</span>
            </div>
            </div>
            <div class="place-actions">
            <div class="action-buttons">
                <button class="edit-btn"><img src="./img/icon/icon-pencil.png" width=24px/></button>
                <button class="delete-btn"><img src="./img/icon/icon-trashcan.png" width=24px/></button>
            </div>
            </div>
        </div>
      `;

      placeDiv.querySelector(".edit-btn").addEventListener("click", () => {
        plansData.places.forEach((p) => delete p.isEditing);
        plansData.places[index].isEditing = true;
        renderSchedule();
      });
    }

    mainContentWrapper.appendChild(placeDiv);
    displayIndex++;
  });

  mainContainer.appendChild(mainContentWrapper);

  const bottomActions = document.createElement("div");
  bottomActions.className = "bottom-actions";
  bottomActions.innerHTML = `<button class="bottom-btn">계획 저장</button>`;
  footerContainer.appendChild(bottomActions);
};

renderSchedule();
