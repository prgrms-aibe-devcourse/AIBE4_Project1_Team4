// --- API 관련 변수 ---
      const GEMINI_API_KEY = "AIzaSyCyurgOODnY2koKUDFL9GoyM9iAjv7BZWo"; // 중요: 여기에 본인의 Gemini API 키를 입력하세요.
      const GOOGLE_MAPS_API_KEY = "AIzaSyAzIcltQOPhxMKFuALbUXC6nDx4kPVUeGs"; // 중요: 여기에 본인의 Google Maps API 키를 입력하세요.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GEMINI_API_KEY}`;

      // --- 지도 관련 전역 변수 ---
      let map;
      let marker;
      let geocoder;

      // --- 요소 선택 ---
      const searchBtn = document.getElementById("search-btn");
      const loadingIndicator = document.getElementById("loading");
      const suggestWrapper = document.getElementById("suggest-wrapper");
      const decreaseBtn = document.getElementById("decrease-btn");
      const increaseBtn = document.getElementById("increase-btn");
      const peopleCountInput = document.getElementById("people-count-input");
      const modal = document.getElementById("placeModal");
      const modalPlaceName = document.getElementById("modal-place-name");
      const closeBtn = document.querySelector(".close-btn");

      // --- 인원 수 조절 이벤트 리스너 ---
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
      
      // --- AI 추천 검색 이벤트 리스너 (기존과 동일) ---
      searchBtn.addEventListener("click", async () => {
        const region = document.getElementById("region-input").value;
        const trip_start_date = document.getElementById("trip-start-date").value;
        const trip_end_date = document.getElementById("trip-end-date").value;
        const peopleCount = peopleCountInput.value;
        const includeSightseeing = document.getElementById("sight-checkbox").checked;

        if (!region || !trip_start_date || !trip_end_date || !peopleCount) {
          alert("모든 정보를 입력해주세요.");
          return;
        }

        const userData = {
          region: region,
          trip_start_date: trip_start_date,
          trip_end_date: trip_end_date,
          number_of_people: parseInt(peopleCount, 10),
          sight: includeSightseeing,
        };

        loadingIndicator.style.display = "block";
        suggestWrapper.innerHTML = "";

        try {
          const prompt = `
          여행객 정보를 바탕으로, 대한민국 내 여행 계획을 **반드시 3가지 버전**으로 추천해줘.
          각 계획은 전체 여행 기간에 맞춰 일자별로 방문할 장소 목록을 포함해야 해.
          각 장소에 대한 정보는 다음 규칙을 반드시 따라야 해:
          1. 'visit_date': 'YYYY-MM-DD' 형식
          2. 'visit_time': 'HH:MM' 형식
          3. 'name': 장소 이름
          4. 'address': 정확한 주소
          5. 'price': 0~4 사이 정수
          6. 'rating': 0.0~5.0 사이 float
          'sight'가 true이면 식당과 관광지를 섞고, false이면 식당 위주로 짜줘.
          아침, 점심, 저녁 식사는 필수로 포함해줘.
          여행 정보:
          - 여행 지역: ${userData.region}
          - 시작일: ${userData.trip_start_date}
          - 종료일: ${userData.trip_end_date}
          - 인원: ${userData.number_of_people}
          - 관광지 추천 여부: ${userData.sight}
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
                          required: ["visit_date", "visit_time", "name", "address", "price", "rating"],
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

          const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig, };
          const response = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), });
          if (!response.ok) throw new Error(`API 호출 실패: ${response.statusText}`);
          const result = await response.json();

          if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
            const aiResponse = JSON.parse(result.candidates[0].content.parts[0].text);
            if (aiResponse.plans && aiResponse.plans.length > 0) {
              renderPlans(aiResponse.plans);
              const finalPlan = aiResponse.plans[0];
              const plansData = {
                start_date: userData.trip_start_date,
                end_date: userData.trip_end_date,
                region: userData.region,
                size: userData.number_of_people,
                places: finalPlan.places,
              };
              console.log("--- 최종 여행 계획 데이터 (plansData) ---");
              console.log(JSON.stringify(plansData, null, 2));
              alert("여행 계획이 생성되었습니다. F12를 눌러 콘솔에서 최종 데이터를 확인하세요.");
            } else { throw new Error("AI가 유효한 계획을 반환하지 않았습니다."); }
          } else {
            console.error("Unexpected API response structure:", result);
            alert("여행 계획을 생성하는 데 실패했습니다. 응답 형식이 올바르지 않습니다.");
          }
        } catch (error) {
          console.error("Error:", error);
          alert(`여행 계획을 생성하는 중 오류가 발생했습니다: ${error.message}`);
        } finally {
          loadingIndicator.style.display = "none";
        }
      });
      
      // --- 화면 렌더링 함수 ---
      function renderPlans(plans) {
        suggestWrapper.innerHTML = "";
        plans.forEach((plan, planIndex) => {
          const planElement = document.createElement("div");
          const placesByDate = plan.places.reduce((acc, place) => {
            const date = place.visit_date;
            if (!acc[date]) acc[date] = [];
            acc[date].push(place);
            return acc;
          }, {});

          let dailyPlansHtml = "";
          Object.keys(placesByDate).sort().forEach((date) => {
              dailyPlansHtml += `<h4>${date}</h4>`;
              const sortedPlaces = placesByDate[date].sort((a, b) => a.visit_time.localeCompare(b.visit_time));
              dailyPlansHtml += "<ul>";
              sortedPlaces.forEach((place) => {
                // 각 버튼에 주소와 이름 데이터를 저장
                dailyPlansHtml += `<li class="place-item">
                                  <span>${place.visit_time} - ${place.name}</span>
                                  <button class="open-modal-btn" data-address="${place.address}" data-name="${place.name}">지도 보기</button>
                                </li>`;
              });
              dailyPlansHtml += "</ul>";
            });

          planElement.innerHTML = `
            <div><hr>
                <div class="plan-header">
                    <h2>계획 ${planIndex + 1}: ${plan.plan_title}</h2>
                    <a href="schedule.html" target="blank">자세히 보기</a>
                </div>
                <p><b>요약:</b> ${plan.summary}</p>
                <div style="border: 1px solid #ccc; padding: 10px; margin: 10px 0;">${dailyPlansHtml}</div>
            </div>`;
          suggestWrapper.appendChild(planElement);
        });
      }

      // --- Modal 및 지도 관련 함수 ---
      function initMap() {
        geocoder = new google.maps.Geocoder();
        const seoul = { lat: 37.5665, lng: 126.978 };
        map = new google.maps.Map(document.getElementById("map"), {
          zoom: 15,
          center: seoul,
        });
        marker = new google.maps.Marker({ map: map, position: seoul });
      }

      function showMapInModal(address, name) {
        modalPlaceName.textContent = name; // 모달 제목을 장소 이름으로 변경
        geocoder.geocode({ address: address }, (results, status) => {
          if (status === "OK") {
            modal.style.display = "block";
            const location = results[0].geometry.location;
            // 모달이 표시된 후 지도의 크기를 재조정하고 중앙을 맞춥니다.
            google.maps.event.trigger(map, "resize");
            map.setCenter(location);
            marker.setPosition(location);

            const infowindow = new google.maps.InfoWindow({ content: `<strong>${name}</strong><br>${address}`});
            infowindow.open(map, marker);
          } else {
            alert("주소를 찾을 수 없습니다: " + status);
          }
        });
      }
      
      suggestWrapper.addEventListener("click", (event) => {
        if (event.target.classList.contains("open-modal-btn")) {
          const address = event.target.dataset.address;
          const name = event.target.dataset.name;
          showMapInModal(address, name);
        }
      });

      closeBtn.addEventListener("click", () => { modal.style.display = "none"; });
      window.addEventListener("click", (event) => { if (event.target == modal) { modal.style.display = "none";} });
      
      // Google Maps API 스크립트 로드
      function loadScript() {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      
      window.onload = loadScript;