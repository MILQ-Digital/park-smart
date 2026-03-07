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
    const { image, currentTime, timezone, side } = await req.json();
    if (!image || !image.startsWith("data:image/")) {
      return new Response(JSON.stringify({ error: "No valid image provided. Please upload a photo of a parking sign." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (image.length > 5_500_000) {
      return new Response(JSON.stringify({ error: "Image is too large. Please use a smaller photo." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const timeContext = currentTime
      ? `The current date and time is: ${currentTime} (timezone: ${timezone || "unknown"}). Use this to determine which rules currently apply.`
      : `Use the current server time as a rough guide: ${new Date().toISOString()}.`;

    const sideContext = side
      ? `The user is asking specifically about the ${side.toUpperCase()} side of the sign (the direction the ${side} arrow points to).`
      : "";

    const systemPrompt = `You are a parking sign interpreter. You analyze images of parking signs and return structured parking information.

${timeContext}

${sideContext}

IMPORTANT RULES:
1. Determine if parking is allowed RIGHT NOW based on the current day, date, and time.
2. If the sign has arrows pointing in different directions (left and right), indicating different rules for different spots, you MUST set "hasMultipleDirections" to true and describe each direction's rules in "directions".
3. If the user has specified a side, only evaluate rules for that side.
4. Be practical and helpful — write as if explaining to someone who just wants a simple answer.
5. You MUST respond by calling the "parse_parking_sign" tool.`;

    const userText = side
      ? `Please analyze this parking sign for the ${side.toUpperCase()} side and tell me if I can park there right now, for how long, and any costs or restrictions.`
      : "Please analyze this parking sign and tell me if I can park here right now, for how long, and any costs or restrictions. If the sign has arrows pointing in different directions for different spots, identify that.";

    const messages = [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "image_url", image_url: { url: image } },
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
                    description: "Whether parking is currently allowed. If hasMultipleDirections is true and no side was specified, set to true if at least one direction allows parking.",
                  },
                  summary: {
                    type: "string",
                    description: "A brief, friendly summary of the parking rules in plain language (1-2 sentences). Include the current time context.",
                  },
                  maxDuration: {
                    type: "string",
                    description: "Maximum parking duration allowed, e.g. '2 hours', '30 minutes'. Null if no limit or if multiple directions.",
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
                  hasMultipleDirections: {
                    type: "boolean",
                    description: "True if the sign has arrows pointing in different directions (left/right) with different rules for different parking spots.",
                  },
                  directions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        side: {
                          type: "string",
                          enum: ["left", "right"],
                          description: "Which direction the arrow points",
                        },
                        canPark: { type: "boolean", description: "Whether parking is allowed on this side right now" },
                        summary: { type: "string", description: "Brief summary of rules for this direction" },
                        maxDuration: { type: "string", description: "Time limit for this side. Null if none." },
                        cost: { type: "string", description: "Cost for this side. Null if not mentioned." },
                      },
                      required: ["side", "canPark", "summary"],
                      additionalProperties: false,
                    },
                    description: "Details for each direction if hasMultipleDirections is true. Empty array otherwise.",
                  },
                },
                required: ["canPark", "summary", "restrictions", "hasMultipleDirections", "directions"],
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
