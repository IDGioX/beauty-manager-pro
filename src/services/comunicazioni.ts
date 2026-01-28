// Service per gestione comunicazioni
import { invoke } from '@tauri-apps/api/core';
import type {
  TemplateMesaggio,
  CreateTemplateInput,
  UpdateTemplateInput,
  ComunicazioneWithCliente,
  ConfigSmtp,
  SaveSmtpConfigInput,
  ConfigScheduler,
  SaveSchedulerConfigInput,
  CampagnaMarketing,
  CreateCampagnaInput,
  CampagnaDestinatario,
  MessageLink,
  ComunicazioniStats,
  FiltriComunicazioni,
  TargetFilters,
} from '../types/comunicazione';
import type { Cliente } from '../types/cliente';
import type { AppuntamentoWithDetails } from '../types/agenda';

// ============================================================================
// GENERAZIONE LINK
// ============================================================================

export async function generateSmsLink(telefono: string, messaggio: string): Promise<MessageLink> {
  return invoke<MessageLink>('generate_sms_link', { telefono, messaggio });
}

export async function generateWhatsappLink(telefono: string, messaggio: string): Promise<MessageLink> {
  return invoke<MessageLink>('generate_whatsapp_link', { telefono, messaggio });
}

export async function generateEmailLink(email: string, oggetto: string, messaggio: string): Promise<MessageLink> {
  return invoke<MessageLink>('generate_email_link', { email, oggetto, messaggio });
}

export async function openMessageLink(link: string): Promise<void> {
  return invoke('open_message_link', { link });
}

// ============================================================================
// EMAIL SMTP
// ============================================================================

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  clienteId?: string,
  appuntamentoId?: string,
  tipo?: string
): Promise<string> {
  return invoke<string>('send_email', {
    to,
    subject,
    body,
    clienteId,
    appuntamentoId,
    tipo,
  });
}

export async function testSmtpConnection(
  host: string,
  port: number,
  username: string,
  password: string,
  encryption: string
): Promise<string> {
  return invoke<string>('test_smtp_connection', {
    host,
    port,
    username,
    password,
    encryption,
  });
}

// ============================================================================
// CONFIG SMTP
// ============================================================================

export async function getSmtpConfig(): Promise<ConfigSmtp | null> {
  return invoke<ConfigSmtp | null>('get_smtp_config');
}

export async function saveSmtpConfig(input: SaveSmtpConfigInput): Promise<ConfigSmtp> {
  return invoke<ConfigSmtp>('save_smtp_config', { input });
}

// ============================================================================
// CONFIG SCHEDULER
// ============================================================================

export async function getSchedulerConfig(): Promise<ConfigScheduler> {
  return invoke<ConfigScheduler>('get_scheduler_config');
}

export async function saveSchedulerConfig(input: SaveSchedulerConfigInput): Promise<ConfigScheduler> {
  return invoke<ConfigScheduler>('save_scheduler_config', { input });
}

// ============================================================================
// TEMPLATE MESSAGGI
// ============================================================================

export async function getTemplates(tipo?: string, canale?: string): Promise<TemplateMesaggio[]> {
  return invoke<TemplateMesaggio[]>('get_templates', { tipo, canale });
}

export async function getTemplateById(id: string): Promise<TemplateMesaggio> {
  return invoke<TemplateMesaggio>('get_template_by_id', { id });
}

export async function createTemplate(input: CreateTemplateInput): Promise<TemplateMesaggio> {
  return invoke<TemplateMesaggio>('create_template', { input });
}

export async function updateTemplate(id: string, input: UpdateTemplateInput): Promise<TemplateMesaggio> {
  return invoke<TemplateMesaggio>('update_template', { id, input });
}

export async function deleteTemplate(id: string): Promise<void> {
  return invoke('delete_template', { id });
}

// ============================================================================
// ELABORAZIONE TEMPLATE
// ============================================================================

export async function processTemplate(
  templateId: string,
  clienteId: string,
  appuntamentoId?: string
): Promise<[string, string | null]> {
  return invoke<[string, string | null]>('process_template', {
    templateId,
    clienteId,
    appuntamentoId,
  });
}

// ============================================================================
// INVIO REMINDER
// ============================================================================

export async function sendReminder(appuntamentoId: string, canale: string): Promise<MessageLink> {
  return invoke<MessageLink>('send_reminder', { appuntamentoId, canale });
}

// ============================================================================
// LOG COMUNICAZIONI
// ============================================================================

export async function getComunicazioni(
  filtri?: FiltriComunicazioni,
  limit?: number,
  offset?: number
): Promise<ComunicazioneWithCliente[]> {
  return invoke<ComunicazioneWithCliente[]>('get_comunicazioni', { filtri, limit, offset });
}

export async function updateComunicazioneStato(
  id: string,
  stato: string,
  erroreMessaggio?: string
): Promise<void> {
  return invoke('update_comunicazione_stato', { id, stato, erroreMessaggio });
}

export async function getComunicazioniStats(): Promise<ComunicazioniStats> {
  return invoke<ComunicazioniStats>('get_comunicazioni_stats');
}

// ============================================================================
// CAMPAGNE MARKETING
// ============================================================================

export async function getCampagne(): Promise<CampagnaMarketing[]> {
  return invoke<CampagnaMarketing[]>('get_campagne');
}

export async function getCampagnaById(id: string): Promise<CampagnaMarketing> {
  return invoke<CampagnaMarketing>('get_campagna_by_id', { id });
}

export async function createCampagna(input: CreateCampagnaInput): Promise<CampagnaMarketing> {
  return invoke<CampagnaMarketing>('create_campagna', { input });
}

export async function updateCampagnaStato(id: string, stato: string): Promise<CampagnaMarketing> {
  return invoke<CampagnaMarketing>('update_campagna_stato', { id, stato });
}

export async function deleteCampagna(id: string): Promise<void> {
  return invoke('delete_campagna', { id });
}

export async function getTargetClienti(filters: TargetFilters, canale: string): Promise<Cliente[]> {
  return invoke<Cliente[]>('get_target_clienti', { filters, canale });
}

export async function prepareCampagnaDestinatari(
  campagnaId: string,
  clienteIds: string[]
): Promise<number> {
  return invoke<number>('prepare_campagna_destinatari', { campagnaId, clienteIds });
}

export async function getCampagnaDestinatari(campagnaId: string): Promise<CampagnaDestinatario[]> {
  return invoke<CampagnaDestinatario[]>('get_campagna_destinatari', { campagnaId });
}

// ============================================================================
// COMPLEANNI
// ============================================================================

export async function getBirthdaysToday(): Promise<Cliente[]> {
  return invoke<Cliente[]>('get_birthdays_today');
}

export async function getUpcomingBirthdays(days: number): Promise<Cliente[]> {
  return invoke<Cliente[]>('get_upcoming_birthdays', { days });
}

// ============================================================================
// APPUNTAMENTI PENDING REMINDER
// ============================================================================

export async function getAppuntamentiPendingReminder(hoursBefore: number): Promise<AppuntamentoWithDetails[]> {
  return invoke<AppuntamentoWithDetails[]>('get_appuntamenti_pending_reminder', { hoursBefore });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Genera e apre direttamente un link per WhatsApp/Email
 */
export async function sendMessage(
  canale: 'whatsapp' | 'email',
  destinatario: string,
  messaggio: string,
  oggetto?: string
): Promise<void> {
  let link: MessageLink;

  switch (canale) {
    case 'whatsapp':
      link = await generateWhatsappLink(destinatario, messaggio);
      break;
    case 'email':
      link = await generateEmailLink(destinatario, oggetto || '', messaggio);
      break;
  }

  await openMessageLink(link.link);
}

/**
 * Ottiene i canali disponibili per un cliente basandosi sui suoi consensi e contatti
 */
export function getAvailableChannels(cliente: {
  cellulare?: string | null;
  telefono?: string | null;
  email?: string | null;
  consenso_whatsapp?: boolean;
  consenso_email?: boolean;
}): Array<'whatsapp' | 'email'> {
  const channels: Array<'whatsapp' | 'email'> = [];
  const phone = cliente.cellulare || cliente.telefono;

  if (phone && cliente.consenso_whatsapp) {
    channels.push('whatsapp');
  }
  if (cliente.email && cliente.consenso_email) {
    channels.push('email');
  }

  return channels;
}

/**
 * Formatta un numero di telefono per la visualizzazione
 */
export function formatPhoneNumber(phone: string): string {
  // Rimuovi spazi e caratteri non numerici tranne +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // Se inizia con +39, formatta come italiano
  if (cleaned.startsWith('+39')) {
    const number = cleaned.slice(3);
    if (number.length === 10) {
      return `+39 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    }
  }

  return cleaned;
}

/**
 * Valida un indirizzo email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida un numero di telefono italiano
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Accetta numeri italiani con o senza prefisso +39
  return /^(\+39)?[0-9]{9,10}$/.test(cleaned);
}
