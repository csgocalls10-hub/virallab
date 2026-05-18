import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

function buildAnalysisPrompt(data) {
  const { url, description, platforms, videoMeta } = data;
  let context = `URL: ${url}\n`;
  if (videoMeta) {
    context += `Título: ${videoMeta.title}\n`;
    context += `Canal: ${videoMeta.channelTitle}\n`;
    context += `Views: ${videoMeta.viewCount}\n`;
    context += `Likes: ${videoMeta.likeCount}\n`;
    context += `Comentários: ${videoMeta.commentCount}\n`;
    context += `Duração: ${videoMeta.duration}\n`;
    if (videoMeta.tags?.length) context += `Tags: ${videoMeta.tags.join(', ')}\n`;
  }
  if (description) context += `Descrição do usuário: ${description}\n`;
  context += `Plataformas alvo: ${platforms.join(', ')}\n`;

  return `Você é um especialista em análise de conteúdo viral e estratégias de mídia social.

Analise o seguinte vídeo viral e retorne APENAS um JSON válido (sem markdown, sem \`\`\`json, apenas o JSON puro):

${context}

O JSON deve ter exatamente esta estrutura:
{
  "viralScore": <número de 0 a 100>,
  "viralLevel": "<Baixo|Médio|Alto|Explosivo>",
  "viralReason": "<explicação de 1-2 frases do motivo principal da viralização>",
  "metrics": {
    "engajamento": "<número>/100",
    "retencao": "<porcentagem>%",
    "compartilhamento": "<Baixo|Médio|Alto|Muito alto>"
  },
  "viralElements": [<lista de 4-6 elementos específicos que causaram a viralização>],
  "emotionalHooks": [<lista de 3-5 gatilhos emocionais identificados, ex: Curiosidade, Surpresa, FOMO, Identificação, Nostalgia, Humor, Inspiração>],
  "platformAdaptations": [
    {
      "platform": "<nome da plataforma>",
      "duration": "<duração ideal>",
      "format": "<formato recomendado>",
      "strategy": "<estratégia detalhada de adaptação>",
      "hashtags": [<5-8 hashtags relevantes>],
      "bestTime": "<horário ideal de publicação>"
    }
  ]
}

Inclua uma adaptação para cada plataforma solicitada: ${platforms.join(', ')}.
Seja específico e prático nas recomendações. Baseie a análise nos dados reais do vídeo.`;
}

function buildScriptPrompt(data) {
  const { url, description, videoMeta, analysisResult } = data;
  let context = '';
  if (videoMeta) context += `Título: ${videoMeta.title}\nDuração: ${videoMeta.duration}\n`;
  if (description) context += `Descrição: ${description}\n`;
  if (analysisResult) context += `Score Viral: ${analysisResult.viralScore}\nElementos: ${analysisResult.viralElements?.join(', ')}\n`;

  return `Você é um editor de vídeo profissional especializado em conteúdo viral.

Com base nesta análise de vídeo viral:
${context}

Gere um roteiro de edição detalhado. Retorne APENAS JSON puro (sem markdown):
{
  "segments": [
    {
      "time": "<timestamp, ex: 0:00 - 0:03>",
      "title": "<título da seção>",
      "description": "<instrução detalhada do que fazer neste trecho>"
    }
  ],
  "soundtrack": "<sugestão de trilha sonora/estilo musical>",
  "editingPace": "<descrição do ritmo de edição recomendado>",
  "hookSuggestion": "<sugestão de gancho para os primeiros 3 segundos>",
  "ctaSuggestion": "<sugestão de call-to-action final>"
}

Inclua 5-7 segmentos com timestamps realistas. Seja específico e prático.`;
}

function getMockAnalysis(platforms) {
  return {
    viralScore: 82,
    viralLevel: "Alto",
    viralReason: "Combinação eficaz de storytelling emocional com edição rápida e gancho forte nos primeiros segundos, gerando alta retenção e compartilhamento orgânico.",
    metrics: { engajamento: "88/100", retencao: "85%", compartilhamento: "Alto" },
    viralElements: [
      "Gancho visual impactante nos primeiros 2 segundos",
      "Edição sincronizada com o ritmo da música",
      "Revelação surpreendente no meio do vídeo",
      "Narrativa que gera identificação pessoal",
      "Call-to-action claro e envolvente no final"
    ],
    emotionalHooks: ["Curiosidade", "Surpresa", "Identificação", "FOMO"],
    platformAdaptations: platforms.map(p => ({
      platform: p,
      duration: p === 'TikTok' ? '30-45s' : p === 'LinkedIn' ? '60-90s' : '30-60s',
      format: p === 'LinkedIn' ? 'Horizontal 16:9 ou Quadrado 1:1' : 'Vertical 9:16',
      strategy: p === 'TikTok'
        ? 'Cortar para o momento mais impactante como gancho. Adicionar texto na tela nos primeiros 3 segundos. Usar trending sound. Manter ritmo acelerado.'
        : p === 'LinkedIn'
        ? 'Adaptar para tom profissional. Adicionar legendas. Começar com insight de valor. Focar em lições e aprendizados.'
        : 'Usar o gancho mais forte como abertura. Adicionar legendas e texto overlay. Otimizar para visualização sem som.',
      hashtags: p === 'TikTok' ? ['#viral', '#fyp', '#dica', '#criadores', '#tendencia']
        : p === 'LinkedIn' ? ['#conteudo', '#marketing', '#estrategia', '#crescimento', '#linkedin']
        : ['#viral', '#reels', '#conteudo', '#trending', '#criativo'],
      bestTime: p === 'LinkedIn' ? '8h-10h (dias úteis)' : '19h-21h',
    }))
  };
}

function getMockScript() {
  return {
    segments: [
      { time: "0:00 - 0:03", title: "🎯 Gancho Inicial", description: "Começar com close-up rápido do momento mais impactante. Adicionar texto bold: 'Você NÃO vai acreditar nisso'. Usar transição rápida com zoom." },
      { time: "0:03 - 0:08", title: "📖 Contexto Rápido", description: "Apresentar o contexto em 5 segundos com narração rápida. Usar cortes a cada 2 segundos para manter atenção." },
      { time: "0:08 - 0:20", title: "⚡ Desenvolvimento", description: "Mostrar a sequência principal com edição no ritmo da música. Alternar entre close e wide shots. Manter energia alta." },
      { time: "0:20 - 0:28", title: "💥 Clímax / Revelação", description: "Momento de surpresa ou revelação principal. Usar pause dramático de 0.5s antes. Efeito sonoro de impacto." },
      { time: "0:28 - 0:35", title: "😱 Reação / Resultado", description: "Mostrar resultado ou reação. Slow motion opcional. Deixar o impacto emocional resonar." },
      { time: "0:35 - 0:40", title: "📢 CTA Final", description: "Texto na tela: 'Segue para mais'. Pergunta que incentiva comentários. Mencionar que o conteúdo completo está no perfil." },
    ],
    soundtrack: "Lo-fi beat energético com drop no clímax, 120-130 BPM. Considerar trending sounds do TikTok para maior alcance.",
    editingPace: "Cortes rápidos a cada 1.5-3 segundos no desenvolvimento. Transições com zoom e whip pan. Slow motion estratégico no clímax.",
    hookSuggestion: "Começar com o frame mais visualmente impactante do vídeo + texto provocativo em bold",
    ctaSuggestion: "Terminar com pergunta aberta que incentive comentários + CTA 'Segue para o próximo'"
  };
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  // Remove markdown code fences if present
  cleaned = cleaned.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.trim();
  return cleaned;
}

const MODELS = ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash-latest'];

async function callGeminiWithRetry(prompt, maxRetries = 2) {
  if (!genAI) return null;

  for (const modelName of MODELS) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`  → Tentando ${modelName} (tentativa ${attempt + 1})...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log(`  ✅ Sucesso com ${modelName}`);
        return JSON.parse(cleanJsonResponse(text));
      } catch (e) {
        const is429 = e.message?.includes('429') || e.message?.includes('quota');
        const is404 = e.message?.includes('404') || e.message?.includes('not found');
        console.error(`  ❌ ${modelName} tentativa ${attempt + 1}: ${e.message?.slice(0, 120)}`);
        
        if (is404) {
          console.log(`  ⚠️ ${modelName} não disponível, pulando...`);
          break; // skip to next model
        } else if (is429 && attempt < maxRetries - 1) {
          const wait = (attempt + 1) * 3000;
          console.log(`  ⏳ Rate limited, aguardando ${wait/1000}s...`);
          await new Promise(r => setTimeout(r, wait));
        } else if (is429) {
          console.log(`  ⚠️ ${modelName} esgotado, tentando próximo modelo...`);
          break;
        } else {
          // Unknown error, try next model
          console.log(`  ⚠️ Erro desconhecido, tentando próximo modelo...`);
          break;
        }
      }
    }
  }
  return null; // all models failed
}

export async function analyzeWithGemini(data) {
  const result = await callGeminiWithRetry(buildAnalysisPrompt(data));
  if (result) return result;
  console.log('  ⚠️ Todos os modelos falharam, usando mock');
  return getMockAnalysis(data.platforms);
}

export async function generateScriptWithGemini(data) {
  const result = await callGeminiWithRetry(buildScriptPrompt(data));
  if (result) return result;
  console.log('  ⚠️ Todos os modelos falharam, usando mock');
  return getMockScript();
}

function buildClipSuggestionsPrompt(data) {
  const { duration, filename, platform } = data;
  return `Você é um editor de vídeo profissional especializado em cortes para redes sociais.

O usuário tem um vídeo com duração de ${Math.floor(duration)} segundos chamado "${filename}".
Ele quer recortar os melhores momentos para postar no ${platform}.

Sugira 3-5 clips ideais com timestamps. Retorne APENAS JSON puro (sem markdown):
{
  "clips": [
    {
      "start": <segundo de início>,
      "end": <segundo de fim>,
      "title": "<título curto do clip com emoji>",
      "description": "<por que esse trecho é bom para a plataforma>"
    }
  ]
}

Regras:
- Os timestamps devem estar dentro de 0 a ${Math.floor(duration)} segundos
- Cada clip deve ter duração adequada para ${platform}
- O primeiro clip deve ser um gancho forte (primeiros segundos)
- Inclua um clip do momento mais impactante/clímax
- Inclua um clip com potencial de CTA/final
- Seja específico e prático`;
}

function getMockClipSuggestions(duration, platform) {
  const dur = Math.floor(duration);
  const clips = [
    { start: 0, end: Math.min(15, dur), title: '🎯 Gancho Inicial', description: 'Use os primeiros segundos como abertura impactante para capturar atenção' },
    { start: Math.min(Math.floor(dur * 0.25), dur - 20), end: Math.min(Math.floor(dur * 0.25) + 20, dur), title: '⚡ Momento de Energia', description: 'Trecho com maior dinamismo e ritmo — ideal para engajamento' },
    { start: Math.min(Math.floor(dur * 0.5), dur - 15), end: Math.min(Math.floor(dur * 0.5) + 15, dur), title: '💥 Clímax', description: 'Ponto alto do vídeo com revelação ou surpresa' },
    { start: Math.max(dur - 20, 0), end: dur, title: '📢 Encerramento + CTA', description: 'Final do vídeo — adapte para call-to-action da plataforma' },
  ].filter(c => c.start < c.end && c.end <= dur);
  return { clips };
}

export async function suggestClipsWithGemini(data) {
  const result = await callGeminiWithRetry(buildClipSuggestionsPrompt(data));
  if (result) return result;
  console.log('  ⚠️ Todos os modelos falharam, usando mock para clips');
  return getMockClipSuggestions(data.duration, data.platform);
}

