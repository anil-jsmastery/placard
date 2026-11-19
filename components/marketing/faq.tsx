import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { APP_NAME, FEATURES } from "@/lib/config";
import { PLANS } from "@/lib/plans";

type Question = { question: string; answer: string; customDomains?: true };

// The domain question shows only with the custom domains switch on (design-system §14).
const QUESTIONS: Question[] = [
  { question: "Do I need to know how to code?", answer: "No. You describe your site and edit it like a document. There’s no code to see or touch." },
  { question: "Can I change what the AI writes?", answer: "Everything. Edit any text, swap images, reorder or delete sections, or ask the AI for changes in plain words." },
  {
    question: "What counts as an AI request?",
    answer: `Each time you ask the AI to build a site or make a change. Free includes ${PLANS.free.aiRequests} a month and Pro includes ${PLANS.pro.aiRequests}. If a request fails, it isn’t counted.`,
  },
  {
    question: "Can I use my own domain?",
    answer: "Yes, on Pro. Add your domain, copy one DNS record to your domain provider, and HTTPS is set up for you.",
    customDomains: true,
  },
  { question: "What happens if I cancel Pro?", answer: `Your sites stay live. The “Made with ${APP_NAME}” badge comes back and the Free limits apply again.` },
  { question: "Where do the photos come from?", answer: "The AI picks from a built-in library of free-to-use photos. You can replace any of them with your own." },
];

/** The landing page FAQ: one answer open at a time, the first open to start. */
export function Faq() {
  const questions = QUESTIONS.filter((q) => !q.customDomains || FEATURES.customDomains);
  return (
    <Accordion type="single" collapsible defaultValue="faq-0" className="divide-y divide-border border-y border-border">
      {questions.map((q, i) => (
        <AccordionItem key={q.question} value={`faq-${i}`} className="not-last:border-b-0 [&_[data-slot=accordion-content]]:-mt-2">
          <AccordionTrigger className="items-center gap-4 py-5 text-base font-semibold hover:no-underline">{q.question}</AccordionTrigger>
          <AccordionContent className="max-w-prose pb-5 text-base leading-relaxed text-muted-foreground">
            <p>{q.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
