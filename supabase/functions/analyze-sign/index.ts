import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the message with the image
    const messages = [
      {
        role: "system",
        content: `You are a parking sign interpreter. You analyze images of parking signs and return structured parking information.

You MUST respond by calling the "parse_parking_sign" tool with the extracted information. Be practical and helpful for someone who just wants to know if they can park.

Consider the current day and time context: the user is checking RIGHT NOW.
If the sign has time-dependent rules, explain which rules apply now and which apply at other times.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Please analyze this parking sign and tell me if I can park here right now, for how long, and any costs or restrictions.",
          },
          {
            type: "image_url",
            image_url: { url: image },
          },
        ],
      },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        tools: [
          {
            type: "function",
            function: {
              name: "parse_parking_sign",
              description: "Return structured parking sign information",
              parameters: {
                type: "object",
                properties: {
                  canPark: {
                    type: "boolean",
                    description: "Whether parking is currently allowed at this spot",
                  },
                  summary: {
                    type: "string",
                    description: "A brief, friendly summary of the parking rules in plain language (1-2 sentences)",
                  },
                  maxDuration: {
                    type: "string",
                    description: "Maximum parking duration allowed, e.g. '2 hours', '30 minutes'. Null if no limit.",
                  },
                  cost: {
                    type: "string",
                    description: "Parking cost info, e.g. '$2/hour', 'Free', 'Metered'. Null if not mentioned on sign.",
                  },
                  restrictions: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of restrictions like 'No parking Sunday', 'Permit required Zone A', 'Street cleaning Thursday 8-10am'",
                  },
                  timeDependent: {
                    type: "string",
                    description: "Explanation of how rules change by time of day or day of week. Null if rules are constant.",
                  },
                },
                required: ["canPark", "summary", "restrictions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "parse_parking_sign" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please wait a moment and try again." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error("AI did not return structured data");
    }

    const parkingInfo = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parkingInfo), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-sign error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
