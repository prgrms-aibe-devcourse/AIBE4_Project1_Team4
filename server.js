const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();
const { SUPABASE_KEY: supabaseKey, SUPABASE_URL: supabaseUrl } = process.env;
console.log("supabaseKey", supabaseKey);
console.log("supabaseUrl", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.get("/plans", async (req, res) => {
  const { data, error } = await supabase.from("plans").select(`
    plan_id,
    start_date,
    end_date,
    size,
    region,
    plan_items (
        places (
            name
        )
    )
`);
  if (error) {
    return res.status(400).json({ error: error.message });
  }
  res.json(data);
});

app.post("/reviews", async (req, res) => {
  console.log("클라이언트로부터 받은 리뷰 데이터:", req.body);
  const { plan_id, review_rating, review } = req.body;
  const { data, error } = await supabase
    .from("reviews")
    .insert({
      plan_id,
      review_rating,
      review,
    })
    .select("*");

  if (error) {
    console.error("Superbase Insert Error Details:", error);
    return res
      .status(500)
      .json({ error: "데이터베이스 저장 오류", details: error.message });
  }

  res.status(201).json({
    message: "리뷰 저장 성공",
    review: data[0],
  });
});

app.get("/reviews/:planId", async (req, res) => {
  const planId = req.params.planId;

  const { data, error } = await supabase
    .from("reviews")
    .select("review_rating, review, created_at")
    .eq("plan_id", planId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Superbase Fetch Reviews Error:", error.message);
    return res.status(500).json({ error: "리뷰 조회 중 오류 발생" });
  }

  res.json(data);
});

app.post("/schedule", async (req, res) => {
  const plansData = req.body;
  try {
    const { start_date, end_date, region, size } = plansData;
    const plansObj = {
      start_date,
      end_date,
      region,
      size,
      created_at: new Date().toISOString(),
    };
    const { data: newPlan, error: planError } = await supabase
      .from("plans")
      .insert(plansObj)
      .select()
      .single();
    if (planError) {
      throw planError;
    }
    const plan_id = newPlan.plan_id;
    console.log("plans 테이블 저장 성공, plan_id:", plan_id);

    for (const place of plansData.places) {
      const { name, address, price, rating } = place;
      const placeObj = { name, address, price, rating };
      const { data: newPlace, error: placeError } = await supabase
        .from("places")
        .insert(placeObj)
        .select()
        .single();
      if (placeError) {
        throw placeError;
      }
      const place_id = newPlace.place_id;
      console.log("places 테이블 저장 성공, place_id:", place_id);

      // 여행 계획이 KST 시간이라 가정하고 UTC timestampz 시간으로 변환한다.
      const combinedDateTime = `${place.visit_date}T${place.visit_time}:00`;
      const visit_datetime = new Date(combinedDateTime).toISOString();
      const planItemObj = {
        plan_id,
        place_id,
        visit_datetime,
        memo: place.memo,
      };
      const { error: itemError } = await supabase
        .from("plan_items")
        .insert(planItemObj);
      if (itemError) {
        throw itemError;
      }
      console.log(`plan_items 테이블 저장 성공: ${place.name} 항목 연결 완료`);
    }
    res.status(201).json({ plan_id });
  } catch (error) {
    console.error("저장 중 오류 발생:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/gemini", async (req, res) => {
  const prompt = req.body.prompt;
  if (!prompt) {
    return res.status(400).json({ error: "프롬프트가 필요합니다." });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
    return res
      .status(500)
      .json({ error: "서버에 API 키가 설정되어 있지 않습니다." });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      const message = errorData.error?.message || response.statusText;
      return res
        .status(response.status)
        .json({ error: `API 요청 실패: ${message}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Gemini API 호출 오류:", error);
    res.status(500).json({ error: "서버 내부 오류" });
  }
});

app.use(express.static(path.join(__dirname, "docs")));
// 루트 요청이 오면 index.html 보내기
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "docs", "index.html"));
});

app.get("/api/geocode", async (req, res) => {
  const { address } = req.query;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!address) {
    return res.status(400).json({ error: "Address is required" });
  }
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "API key is not configured on the server" });
  }

  // Google Geocoding API에 보낼 요청 URL 생성
  const baseUrl = "https://maps.googleapis.com/maps/api/geocode/json";
  const params = new URLSearchParams({
    address: address,
    key: apiKey,
  });
  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error_message || `HTTP error! status: ${response.status}`
      );
    }

    res.json(data);
  } catch (error) {
    console.error("Error fetching from Google Geocoding API:", error.message);
    res.status(500).json({ error: "Failed to fetch geocoding data" });
  }
});

app.get("/api/key", (req, res) => {
  res.json({ apiKey: process.env.GOOGLE_MAPS_API_KEY });
});

app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
