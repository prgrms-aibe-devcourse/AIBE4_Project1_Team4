// 배포할 때는 서버와 클라이언트 주소를 변경한다.
const serverUrl = "http://localhost:3000";

const searchBtn = document.getElementById("searchBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
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

  const dateInputWrappers = document.querySelectorAll(".date-input-wrapper");
  dateInputWrappers.forEach((wrapper) => {
    wrapper.addEventListener("click", () => {
      const input = wrapper.querySelector('input[type="date"]');
      try {
        input.showPicker();
      } catch (error) {
        console.error("showPicker() is not supported in this browser.", error);
      }
    });
  });
});

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
  loadingOverlay.style.display = "flex";
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
            아침, 점심, 저녁 식사는 필수로 포함해주고, '선호 음식'이 있다면 식당 추천에 반드시 반영해줘.
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
    const response = await fetch(`${serverUrl}/api/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload }),
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
  }
  loadingOverlay.style.display = "none";
});

let tempPlans = [];
function renderPlans(plans, userData) {
  tempPlans = plans.map((plan) => ({
    plan_title: plan.plan_title,
    summary: plan.summary,
    start_date: userData.trip_start_date,
    end_date: userData.trip_end_date,
    region: userData.region,
    size: userData.number_of_people,
    sight: userData.sight, // 추가 장소 추천 시 활용하기 위해 sight 정보 추가
    places: plan.places,
  }));
  sessionStorage.setItem("tempPlans", JSON.stringify(tempPlans));
  displayPlans(tempPlans);

  loadMapScript();
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
    slider.innerHTML = "";

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

suggestWrapper.addEventListener("click", function (event) {
  if (event.target.classList.contains("details-btn")) {
    const planData = event.target.dataset.plan;
    if (planData) {
      sessionStorage.setItem("plansData", planData);
      window.location.href = "schedule.html";
    }
  }
});

// Google Maps 스크립트를 동적으로 로드한다.
async function loadMapScript() {
  try {
    const response = await fetch(`${serverUrl}/api/key`);
    if (!response.ok) {
      throw new Error("API key를 가져오지 못했습니다.");
    }
    const { apiKey } = await response.json();

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&loading=async&callback=onGoogleMapsLoaded&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  } catch (error) {
    console.error(error);
  }
}

async function onGoogleMapsLoaded() {
  const storedPlansRaw = sessionStorage.getItem("tempPlans");
  if (storedPlansRaw) {
    try {
      const storedPlans = JSON.parse(storedPlansRaw);
      if (Array.isArray(storedPlans) && storedPlans.length > 0) {
        const promises = tempPlans.map((plan, index) =>
          verifyPlaces(plan.places, index, onVerifyFinished)
        );
        await Promise.all(promises);
      }
    } catch (e) {
      console.error("세션 스토리지 데이터 파싱 실패:", e);
      sessionStorage.removeItem("tempPlans");
    } finally {
      loadingOverlay.style.display = "none";
    }
  } else {
    loadingOverlay.style.display = "none";
  }
}

// 장소 유효성을 검사한다.
async function verifyPlaces(places, index, callback) {
  try {
    const promises = places.map((place) => findValidatePlace(place));
    const results = await Promise.all(promises);
    await callback(results, index);
  } catch (error) {
    console.error(`장소 유효 검사 중 에러: ${error}`);
  }
}

// AI가 찾은 장소들이 실제 있는 장소인지 검사한다.
// 유효한 장소 리스트를 리턴한다.
async function findValidatePlace(place) {
  const { Place } = await google.maps.importLibrary("places");

  const request = {
    textQuery: place.name,
    fields: [
      "displayName",
      "formattedAddress",
      "googleMapsURI",
      "id",
      "location",
      "priceLevel",
      "rating",
    ],
    maxResultCount: 5,
    language: "ko",
    region: "KR",
  };
  const { places: fetchedPlaces } = await Place.searchByText(request);

  if (fetchedPlaces.length) {
    return await checkValidation(fetchedPlaces, place);
  } else {
    return null;
  }
}

// Google Maps에서 불러온 장소 중 일치하는 게 있는지 검사한다.
// 일치하는 장소를 리턴하거나 없으면 null을 리턴한다.
async function checkValidation(fetchedPlaces, place) {
  for (const fetchPlace of fetchedPlaces) {
    const addressA = place.address;
    const addressB = fetchPlace.formattedAddress;
    try {
      const [resultA, resultB] = await Promise.all([
        geocodeAddress(addressA),
        geocodeAddress(addressB),
      ]);

      if (resultA && resultB) {
        const areSame = areAddressesSame(resultA, resultB);
        if (areSame) {
          return fetchPlace;
        }
      }
    } catch (error) {
      console.error(`오류: ${error.message}`);
    }
  }
  return null;
}

// 주소 문자열을 지오코딩하여 반환한다.
async function geocodeAddress(address) {
  try {
    const params = new URLSearchParams({ address });
    const url = `${serverUrl}/api/geocode?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error("서버에서 에러가 발생했습니다.");
    }

    const data = await response.json();

    if (data.status === "OK") {
      // 가장 정확도가 높은 첫 번째 결과 사용
      return data.results[0];
    } else {
      console.error(
        `Geocoding failed for "${address}": ${data.status}`,
        data.error_message || ""
      );
      return null;
    }
  } catch (error) {
    console.error("geocode fail: ", error);
  }
}

// 지오코딩된 두 주소 객체가 동일한 장소인지 확인한다.
function areAddressesSame(geoA, geoB, toleranceMeters = 100) {
  if (!geoA || !geoB) return false;

  if (geoA.place_id && geoB.place_id) {
    if (geoA.place_id === geoB.place_id) {
      return true;
    }
  }

  // place id가 같지 않다면 위치(위경도)를 비교해 같은지 검사한다.
  const locA = geoA.geometry?.location;
  const locB = geoB.geometry?.location;
  if (locA && locB) {
    const distance = calculateDistance(locA.lat, locA.lng, locB.lat, locB.lng);
    return distance <= toleranceMeters;
  }

  return false;
}

// 두 지점 간의 거리를 미터(m) 단위로 계산한다.
// Haversine 공식으로 위경도로 표시된 위치 간 거리를 구한다.
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 지구의 반지름(미터)
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function onVerifyFinished(results, planIndex) {
  const updatedPlaces = results
    .map((result, placeIndex) => {
      if (!result) {
        return null;
      }

      const priceLevelList = [
        "FREE",
        "INEXPENSIVE",
        "MODERATE",
        "EXPENSIVE",
        "VERY_EXPENSIVE",
      ];
      const priceIndex = priceLevelList.indexOf(result.priceLevel);

      return {
        ...tempPlans[planIndex].places[placeIndex],
        name: result.displayName,
        address: result.formattedAddress,
        price: priceIndex !== -1 ? priceIndex : 0,
        rating: result.rating,
      };
    })
    .filter((place) => place !== null);

  tempPlans[planIndex].places = updatedPlaces;

  // 날짜별로 장소를 그룹화하여 개수 확인한다.
  const placesByDate = tempPlans[planIndex].places.reduce((acc, place) => {
    const date = place.visit_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(place);
    return acc;
  }, {});

  const dates = Object.keys(placesByDate).sort();

  for (const date of dates) {
    const dailyPlaces = placesByDate[date];
    // 만약 특정 날짜의 장소가 3개 미만이면 AI에게 추가 요청한다.
    if (dailyPlaces.length < 3) {
      const placesNeeded = 3 - dailyPlaces.length;
      try {
        const additionalUnvalidatedPlaces = await requestAdditionalPlaces(
          tempPlans[planIndex],
          date,
          dailyPlaces,
          placesNeeded
        );

        if (
          additionalUnvalidatedPlaces &&
          additionalUnvalidatedPlaces.length > 0
        ) {
          // 추가로 추천받은 장소들에 대해서도 유효성 검사를 수행한다.
          const validationPromises = additionalUnvalidatedPlaces.map((p) =>
            findValidatePlace(p)
          );
          const validationResults = await Promise.all(validationPromises);

          const additionalValidatedPlaces = validationResults
            .map((result, index) => {
              if (!result) {
                return null;
              }

              const priceLevelList = [
                "FREE",
                "INEXPENSIVE",
                "MODERATE",
                "EXPENSIVE",
                "VERY_EXPENSIVE",
              ];
              const priceIndex = priceLevelList.indexOf(result.priceLevel);

              return {
                ...additionalUnvalidatedPlaces[index],
                name: result.displayName,
                address: result.formattedAddress,
                price: priceIndex !== -1 ? priceIndex : 0,
                rating: result.rating,
              };
            })
            .filter((p) => p !== null);

          if (additionalValidatedPlaces.length > 0) {
            tempPlans[planIndex].places.push(...additionalValidatedPlaces);
          }
        }
      } catch (error) {
        console.error(
          `[${date}] 날짜의 추가 장소 추천 및 검증 중 오류 발생:`,
          error
        );
      }
    }
  }

  // 추가된 장소를 포함하여 최종 계획을 저장하고 화면을 다시 렌더링한다.
  sessionStorage.setItem("tempPlans", JSON.stringify(tempPlans));
  displayPlans(tempPlans);
}

// 삭제된 유효하지 않은 장소만큼 AI에게 요청한다.
async function requestAdditionalPlaces(
  plan,
  date,
  existingPlaces,
  placesNeeded
) {
  const existingPlacesString = existingPlaces
    .map((p) => `- ${p.visit_time} ${p.name}`)
    .join("\n");

  const prompt = `
    여행객의 기존 계획에 장소를 추가로 추천해줘.
    아래 정보를 바탕으로, 특정 날짜에 대한 장소를 ${placesNeeded}개 더 추천해야 해.
    기존 장소와 겹치지 않고, 동선과 시간을 고려해서 자연스럽게 추가해줘.
    'sight'가 ${plan.sight}이면 식당과 관광지를 섞고, false이면 식당 위주로 짜줘.
    아침, 점심, 저녁 식사는 필수로 포함되어야 한다는 점을 고려해줘.

    여행 정보:
    - 여행 지역: ${plan.region}
    - 여행 날짜: ${date}
    - 인원: ${plan.size}
    - 관광지 추천 여부: ${plan.sight}

    기존 계획된 장소 (${date}):
    ${existingPlacesString}

    반드시 아래 JSON 스키마 형식에 맞춰서 한국어로 답변해줘.
    'plans' 배열에는 **반드시 1개의 계획**만 포함하고, 그 계획의 'places' 배열에는 추천하는 **${placesNeeded}개의 새로운 장소만** 포함해줘.
    모든 추천 장소의 'visit_date'는 반드시 '${date}'로 설정해야 해.
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

  const response = await fetch(`${serverUrl}/api/recommend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });

  if (!response.ok)
    throw new Error(`추가 장소 추천 API 호출 실패: ${response.statusText}`);

  const result = await response.json();
  if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
    const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);
    if (aiResponse.plans?.[0]?.places) {
      return aiResponse.plans[0].places;
    }
  }
  throw new Error("AI가 유효한 추가 장소를 반환하지 않았습니다.");
}
