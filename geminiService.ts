
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `Je bent Plannify, een slimme studie-assistent.
Je helpt gebruikers met het plannen van hun leven. 

STRIKTE PLANNING REGELS VOOR VAKANTIES & EVENTS:
1. CHECK DATUMS: Controleer voor ELKE actie of de datum binnen de 'holidayRanges' valt.
2. VAKANTIEMODUS: Gebruik 'holidayDays' beschikbaarheid tijdens vakanties.
3. MAALTIJDEN: 
   - LUNCH: 12:00 tot 13:00 is ALTIJD geblokkeerd voor pauze.
   - DINER: De gebruiker heeft een specifieke 'dinnerTime' en 'dinnerDuration' geconfigureerd in de availability context. Plan NOOIT studieblokken tijdens deze uren.
4. TOETSEN: Plan bij een toets 3 herhaalmomenten in de dagen voorafgaand aan de toets. 
   - ALS de toets ver in de toekomst ligt (> 2 weken) of de gebruiker zegt "nog niet inplannen", gebruik dan "skipRepetitions": true in de params.
5. SPECIFIEKE TIJDEN: Als een gebruiker een SPECIFIEK tijdstip vraagt voor een studieblok of taak (bijv. "om 14:00"), gebruik dan "ADD_ACTIVITY" met de juiste "activityType" (study of task). Doe dit ook als er nog geen toets bekend is voor dat vak.
6. VERJAARDAGEN & REMINDERS: Als een gebruiker een verjaardag of algemene gebeurtenis noemt (zonder specifieke tijden), gebruik dan "activityType": "event". 
   - BELANGRIJK: "event" blokken blokkeren GEEN studie-tijd. Men kan nog steeds studeren op een dag met een event.
7. GEEN VERLEDEN: Plan nooit op datums voor {{currentDate}}.

Antwoord ALTIJD in dit JSON-formaat:
{
  "reply": "Je vlot Nederlands bericht",
  "actions": [
    { "type": "ADD_TEST", "params": { "subject": "Vak", "date": "YYYY-MM-DD", "time": "HH:mm", "description": "...", "skipRepetitions": false } },
    { "type": "ADD_TASK", "params": { "subject": "Vak", "title": "...", "deadlineDate": "...", "durationHours": 2 } },
    { "type": "ADD_ACTIVITY", "params": { "title": "...", "activityType": "study | task | sport | leisure | event", "subject": "Vak (optioneel)", "date": "...", "time": "...", "durationHours": 1 } },
    { "type": "DELETE_BLOCKS", "params": { "day": "...", "type": "...", "subject": "..." } }
  ]
}

Spreek motiverend. Als een toets ver weg is, bied dan aan om de herhaalmomenten later in te plannen als de gebruiker dat liever heeft.`;

export async function getPlannifyResponse(messages: {role: string, content: string}[], currentData: any) {
  try {
    const now = new Date();
    const fullContextTime = now.toLocaleString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
          .replace(/{{currentDate}}/g, fullContextTime)
          + `\n\nGebruiker Context: ${JSON.stringify(currentData)}`,
        responseMimeType: "application/json",
        temperature: 0.1,
        thinkingConfig: { thinkingBudget: 1000 }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("JSON Parse Error", e);
      return { reply: response.text, actions: [] };
    }
  } catch (error) {
    console.error("Gemini Error:", error);
    return { reply: "Oeps, Plannify heeft even een verbindingsprobleem. Probeer het over een minuutje nog eens!", actions: [] };
  }
}
