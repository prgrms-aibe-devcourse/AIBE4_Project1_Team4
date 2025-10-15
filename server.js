const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
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

app.get("/", (req, res) => {
  res.send("bye");
});

app.get("/plans", async (req, res) => {
  const { data, error } = await supabase.from("plans").select("*");
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
app.listen(port, () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
