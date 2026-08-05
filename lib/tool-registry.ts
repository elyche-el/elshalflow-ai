/**
 * Tool Registry — Agent Mode tool definitions
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const AGENT_TOOLS: Tool[] = [
  {
    name: "gmail_send_email",
    description: "Envoyer un email via Gmail",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "Destinataire" },
        subject: { type: "string", description: "Sujet" },
        body: { type: "string", description: "Corps du message" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "slack_send_message",
    description: "Envoyer un message Slack",
    parameters: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Nom du canal" },
        text: { type: "string", description: "Texte du message" },
      },
      required: ["channel", "text"],
    },
  },
  {
    name: "github_create_issue",
    description: "Créer une issue GitHub",
    parameters: {
      type: "object",
      properties: {
        repo: { type: "string", description: "Dépôt (owner/repo)" },
        title: { type: "string", description: "Titre de l'issue" },
        body: { type: "string", description: "Description" },
      },
      required: ["repo", "title"],
    },
  },
  {
    name: "notion_create_page",
    description: "Créer une page Notion",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre de la page" },
        content: { type: "string", description: "Contenu markdown" },
      },
      required: ["title"],
    },
  },
  {
    name: "calendar_create_event",
    description: "Créer un événement calendrier",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string", description: "Titre de l'événement" },
        start: { type: "string", description: "Date/heure début ISO" },
        end: { type: "string", description: "Date/heure fin ISO" },
      },
      required: ["summary", "start"],
    },
  },
  {
    name: "twitter_post_tweet",
    description: "Publier un tweet",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Texte du tweet (280 max)" },
      },
      required: ["text"],
    },
  },
  {
    name: "linear_create_task",
    description: "Créer une tâche Linear",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Titre de la tâche" },
        description: { type: "string", description: "Description" },
      },
      required: ["title"],
    },
  },
];

export function getToolByName(name: string): Tool | undefined {
  return AGENT_TOOLS.find((t) => t.name === name);
}
