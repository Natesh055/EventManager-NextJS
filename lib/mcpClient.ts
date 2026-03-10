import OpenAI from 'openai';

export interface MCPResponse {
  reply: string;
  extracted?: Partial<{
    name: string;
    date: string;
    time: string;
    location: string;
    description: string;
  }>;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function sendToMCP(
  message: string,
  context: any
): Promise<MCPResponse> {
  try {
    const systemPrompt = `You are a helpful assistant that helps users create events. When users send messages about creating events, extract the following information if available:
- name: The event name
- date: The event date (in YYYY-MM-DD format)
- location: The event location
- description: A description of the event

Respond naturally to the user and provide the extracted information in your response. If information is missing, ask for it politely.

Current context: ${JSON.stringify(context)}

User message: ${message}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process your request.";

    // Extract information from the reply using more robust parsing
    const extracted: MCPResponse['extracted'] = {};

    // Parse structured information from the reply
    const lines = reply.split('\n');
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();

      // Look for patterns like "- Name: Tech Meetup" or "Name: Tech Meetup"
      if (lowerLine.includes('name:') || lowerLine.includes('• name:')) {
        const nameMatch = line.match(/(?:name|• name):\s*(.+)/i);
        if (nameMatch) extracted.name = nameMatch[1].trim();
      }

      if (lowerLine.includes('date:') || lowerLine.includes('• date:')) {
        const dateMatch = line.match(/(?:date|• date):\s*(.+)/i);
        if (dateMatch) {
          let date = dateMatch[1].trim();
          // Convert common formats to YYYY-MM-DD
          if (date.match(/march\s*(\d+)(?:th|st|nd|rd)?,?\s*(\d{4})/i)) {
            const day = RegExp.$1.padStart(2, '0');
            const year = RegExp.$2;
            date = `${year}-03-${day}`;
          } else if (date.match(/march\s*(\d+)(?:th|st|nd|rd)?/i)) {
            const day = RegExp.$1.padStart(2, '0');
            date = `2023-03-${day}`; // Assuming current year
          } else if (date.match(/(\d{4})-(\d{2})-(\d{2})/)) {
            // Already in YYYY-MM-DD format
            date = date;
          } else if (date.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)) {
            // MM/DD/YYYY or DD/MM/YYYY format - assume MM/DD/YYYY
            const month = RegExp.$1.padStart(2, '0');
            const day = RegExp.$2.padStart(2, '0');
            const year = RegExp.$3;
            date = `${year}-${month}-${day}`;
          }
          extracted.date = date;
        }
      }

      if (lowerLine.includes('time:') || lowerLine.includes('• time:')) {
        const timeMatch = line.match(/(?:time|• time):\s*([\d:]+(?:\s*(?:am|pm))?)/i);
        if (timeMatch) {
          let time = timeMatch[1].trim();
          // Convert to 24-hour format
          if (time.toLowerCase().includes('pm') && !time.includes('12')) {
            const hour = parseInt(time) + 12;
            time = `${hour}:${time.split(':')[1].replace(/\s*(am|pm)/i, '')}`;
          } else if (time.toLowerCase().includes('am') && time.startsWith('12')) {
            time = `00:${time.split(':')[1].replace(/\s*(am|pm)/i, '')}`;
          } else {
            time = time.replace(/\s*(am|pm)/i, '');
          }
          extracted.time = time;
        }
      }

      if (lowerLine.includes('location:') || lowerLine.includes('• location:')) {
        const locationMatch = line.match(/(?:location|• location):\s*(.+)/i);
        if (locationMatch) extracted.location = locationMatch[1].trim();
      }

      if (lowerLine.includes('description:') || lowerLine.includes('• description:')) {
        const descMatch = line.match(/(?:description|• description):\s*(.+)/i);
        if (descMatch) extracted.description = descMatch[1].trim();
      }
    }

    // Also try the original regex approach as fallback
    if (!extracted.name) {
      const nameMatch = reply.match(/name[:\s]*([^\n,]+)/i);
      if (nameMatch) extracted.name = nameMatch[1].trim();
    }
    if (!extracted.date) {
      const dateMatch = reply.match(/date[:\s]*([\d\-]+)/);
      if (dateMatch) extracted.date = dateMatch[1].trim();
    }
    if (!extracted.time) {
      const timeMatch = reply.match(/time[:\s]*([\d:]+)/);
      if (timeMatch) extracted.time = timeMatch[1].trim();
    }
    if (!extracted.location) {
      const locationMatch = reply.match(/location[:\s]*([^\n,]+)/i);
      if (locationMatch) extracted.location = locationMatch[1].trim();
    }
    if (!extracted.description) {
      const descMatch = reply.match(/description[:\s]*([^\n]+)/i);
      if (descMatch) extracted.description = descMatch[1].trim();
    }

    return {
      reply,
      extracted: Object.keys(extracted).length > 0 ? extracted : undefined
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error("Failed to process chat message");
  }
}
