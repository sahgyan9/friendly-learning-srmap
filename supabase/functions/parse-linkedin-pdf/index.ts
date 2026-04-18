// Parse LinkedIn PDF resume and extract structured profile data using Lovable AI

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { pdfBase64, mimeType } = await req.json();
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "pdfBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const finalMime = mimeType || "application/pdf";

    const systemPrompt = `You are an expert resume parser. Extract structured information from a LinkedIn profile PDF. 
Return ONLY the data via the provided tool. If a field is unknown, return an empty string.
- "skills" must be a comma-separated string of distinct skills (max 15).
- "bio" should be a concise 2-3 sentence professional summary in first person.
- "department" is the user's field of study or major (e.g. "Computer Science").
- "year_of_studies" must be one of: "1st Year","2nd Year","3rd Year","4th Year","5th Year","Graduated" or empty.
- "linkedin_url" should be the full LinkedIn profile URL if visible.`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract mentor profile fields from this LinkedIn PDF.",
                },
                {
                  type: "file",
                  file: {
                    filename: "linkedin.pdf",
                    file_data: `data:${finalMime};base64,${pdfBase64}`,
                  },
                },
              ],
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_profile",
                description: "Return extracted mentor profile fields.",
                parameters: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    department: { type: "string" },
                    university: { type: "string" },
                    year_of_studies: { type: "string" },
                    skills: { type: "string" },
                    bio: { type: "string" },
                    linkedin_url: { type: "string" },
                    hobbies: { type: "string" },
                    mobile: { type: "string" },
                  },
                  required: [
                    "name",
                    "department",
                    "university",
                    "year_of_studies",
                    "skills",
                    "bio",
                    "linkedin_url",
                    "hobbies",
                    "mobile",
                  ],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "extract_profile" },
          },
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Failed to parse PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsRaw = toolCall?.function?.arguments;
    if (!argsRaw) {
      console.error("No tool call in response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Could not extract data from PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const extracted = JSON.parse(argsRaw);

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-linkedin-pdf error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
