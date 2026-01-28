import { useState, useEffect } from 'react';
import { Toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import {
  MessageSquare,
  MessageCircle,
  Mail,
  Calendar,
  Cake,
  BarChart3,
  FileText,
  Settings,
  Send,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit2,
  Trash2,
  Save,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Percent,
} from 'lucide-react';
import * as comunicazioniService from '../services/comunicazioni';
import type {
  ComunicazioniStats,
  ComunicazioneWithCliente,
  TemplateMesaggio,
  CampagnaMarketing,
  ConfigScheduler,
  CreateTemplateInput,
  UpdateTemplateInput,
} from '../types/comunicazione';
import type { Cliente } from '../types/cliente';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

type ComunicazioniTab = 'dashboard' | 'templates' | 'campagne' | 'automazioni' | 'storico';

// Stat Card component with theme support
interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; positive: boolean };
  colorType: 'primary' | 'accent' | 'success' | 'warning';
}

function StatCard({ title, value, subtitle, icon, trend, colorType }: StatCardProps) {
  const colorVar = colorType === 'success' ? '--color-success'
    : colorType === 'warning' ? '--color-warning'
    : `--color-${colorType}`;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: '0 4px 20px var(--glass-shadow)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: `var(${colorVar})` }}
      />

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--color-text-primary)' }}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.positive ? (
                <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
              ) : (
                <TrendingDown size={14} style={{ color: 'var(--color-danger)' }} />
              )}
              <span
                className="text-xs font-medium"
                style={{ color: trend.positive ? 'var(--color-success)' : 'var(--color-danger)' }}
              >
                {trend.positive ? '+' : ''}{trend.value}% vs sett. scorsa
              </span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `color-mix(in srgb, var(${colorVar}) 15%, transparent)`,
          }}
        >
          <div style={{ color: `var(${colorVar})` }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

export function Comunicazioni() {
  const [activeTab, setActiveTab] = useState<ComunicazioniTab>('dashboard');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [loading, setLoading] = useState(false);

  // Dashboard state
  const [stats, setStats] = useState<ComunicazioniStats | null>(null);
  const [recentMessages, setRecentMessages] = useState<ComunicazioneWithCliente[]>([]);
  const [birthdaysToday, setBirthdaysToday] = useState<Cliente[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Cliente[]>([]);

  // Templates state
  const [templates, setTemplates] = useState<TemplateMesaggio[]>([]);

  // Campagne state
  const [campagne, setCampagne] = useState<CampagnaMarketing[]>([]);

  // Automazioni state
  const [schedulerConfig, setSchedulerConfig] = useState<ConfigScheduler | null>(null);

  // Template Modal state
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateMesaggio | null>(null);
  const [templateForm, setTemplateForm] = useState({
    codice: '',
    nome: '',
    tipo: 'reminder' as 'reminder' | 'birthday' | 'marketing' | 'custom',
    canale: 'whatsapp' as 'whatsapp' | 'email',
    oggetto: '',
    corpo: '',
    attivo: true,
  });
  const [templateSaving, setTemplateSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, messagesData, birthdaysTodayData, upcomingData] = await Promise.all([
        comunicazioniService.getComunicazioniStats(),
        comunicazioniService.getComunicazioni(undefined, 10),
        comunicazioniService.getBirthdaysToday(),
        comunicazioniService.getUpcomingBirthdays(7),
      ]);
      setStats(statsData);
      setRecentMessages(messagesData);
      setBirthdaysToday(birthdaysTodayData);
      setUpcomingBirthdays(upcomingData);
    } catch (error) {
      console.error('Errore caricamento dashboard:', error);
      showToast('Errore nel caricamento dei dati', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await comunicazioniService.getTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Errore caricamento template:', error);
      showToast('Errore nel caricamento dei template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCampagne = async () => {
    setLoading(true);
    try {
      const data = await comunicazioniService.getCampagne();
      setCampagne(data);
    } catch (error) {
      console.error('Errore caricamento campagne:', error);
      showToast('Errore nel caricamento delle campagne', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSchedulerConfig = async () => {
    setLoading(true);
    try {
      const data = await comunicazioniService.getSchedulerConfig();
      setSchedulerConfig(data);
    } catch (error) {
      console.error('Errore caricamento config scheduler:', error);
      showToast('Errore nel caricamento della configurazione', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openTemplateModal = (template?: TemplateMesaggio) => {
    if (template) {
      setEditingTemplate(template);
      setTemplateForm({
        codice: template.codice,
        nome: template.nome,
        tipo: template.tipo,
        canale: template.canale,
        oggetto: template.oggetto || '',
        corpo: template.corpo,
        attivo: template.attivo,
      });
    } else {
      setEditingTemplate(null);
      setTemplateForm({
        codice: '',
        nome: '',
        tipo: 'reminder',
        canale: 'whatsapp',
        oggetto: '',
        corpo: '',
        attivo: true,
      });
    }
    setIsTemplateModalOpen(true);
  };

  const closeTemplateModal = () => {
    setIsTemplateModalOpen(false);
    setEditingTemplate(null);
    setTemplateForm({
      codice: '',
      nome: '',
      tipo: 'reminder',
      canale: 'whatsapp',
      oggetto: '',
      corpo: '',
      attivo: true,
    });
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.codice || !templateForm.nome || !templateForm.corpo) {
      showToast('Compila tutti i campi obbligatori', 'error');
      return;
    }

    setTemplateSaving(true);
    try {
      if (editingTemplate) {
        const updateInput: UpdateTemplateInput = {
          nome: templateForm.nome,
          oggetto: templateForm.oggetto || undefined,
          corpo: templateForm.corpo,
          attivo: templateForm.attivo,
        };
        await comunicazioniService.updateTemplate(editingTemplate.id, updateInput);
        showToast('Template aggiornato con successo', 'success');
      } else {
        const createInput: CreateTemplateInput = {
          codice: templateForm.codice,
          nome: templateForm.nome,
          tipo: templateForm.tipo,
          canale: templateForm.canale,
          oggetto: templateForm.oggetto || undefined,
          corpo: templateForm.corpo,
        };
        await comunicazioniService.createTemplate(createInput);
        showToast('Template creato con successo', 'success');
      }
      closeTemplateModal();
      loadTemplates();
    } catch (error: any) {
      console.error('Errore salvataggio template:', error);
      showToast(error?.message || 'Errore durante il salvataggio', 'error');
    } finally {
      setTemplateSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo template?')) return;

    try {
      await comunicazioniService.deleteTemplate(id);
      showToast('Template eliminato', 'success');
      loadTemplates();
    } catch (error: any) {
      console.error('Errore eliminazione template:', error);
      showToast(error?.message || 'Errore durante l\'eliminazione', 'error');
    }
  };

  const handleTabChange = (tab: ComunicazioniTab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'dashboard':
        loadDashboardData();
        break;
      case 'templates':
        loadTemplates();
        break;
      case 'campagne':
        loadCampagne();
        break;
      case 'automazioni':
        loadSchedulerConfig();
        break;
    }
  };

  const getChannelIcon = (canale: string, size = 16) => {
    switch (canale) {
      case 'whatsapp':
        return <MessageCircle size={size} style={{ color: '#25D366' }} />;
      case 'email':
        return <Mail size={size} style={{ color: 'var(--color-accent)' }} />;
      default:
        return <MessageSquare size={size} style={{ color: 'var(--color-text-muted)' }} />;
    }
  };

  const getStatusBadge = (stato: string) => {
    const styles: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
      inviato: {
        bg: 'color-mix(in srgb, var(--color-accent) 15%, transparent)',
        color: 'var(--color-accent)',
        icon: <Send size={12} />
      },
      consegnato: {
        bg: 'color-mix(in srgb, var(--color-success) 15%, transparent)',
        color: 'var(--color-success)',
        icon: <CheckCircle size={12} />
      },
      errore: {
        bg: 'color-mix(in srgb, var(--color-danger) 15%, transparent)',
        color: 'var(--color-danger)',
        icon: <XCircle size={12} />
      },
      pending: {
        bg: 'color-mix(in srgb, var(--color-warning) 15%, transparent)',
        color: 'var(--color-warning)',
        icon: <Clock size={12} />
      },
    };

    const style = styles[stato] || styles.pending;
    const label = stato === 'inviato' ? 'Inviato'
      : stato === 'consegnato' ? 'Consegnato'
      : stato === 'errore' ? 'Errore'
      : 'In attesa';

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
        style={{ background: style.bg, color: style.color }}
      >
        {style.icon} {label}
      </span>
    );
  };

  // Calculate analytics
  const getAnalytics = () => {
    if (!stats) return null;

    const totale = stats.inviati + stats.errori;
    const successRate = totale > 0 ? Math.round((stats.inviati / totale) * 100) : 0;

    // Channel distribution
    const totalByChannel = stats.per_canale.reduce((acc, c) => acc + c.count, 0);
    const channelData = stats.per_canale.map(c => ({
      ...c,
      percentage: totalByChannel > 0 ? Math.round((c.count / totalByChannel) * 100) : 0
    }));

    // Type distribution
    const totalByType = stats.per_tipo.reduce((acc, t) => acc + t.count, 0);
    const typeData = stats.per_tipo.map(t => ({
      ...t,
      percentage: totalByType > 0 ? Math.round((t.count / totalByType) * 100) : 0
    }));

    return { successRate, channelData, typeData, totale };
  };

  const analytics = getAnalytics();

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Messaggi Oggi"
          value={stats?.oggi || 0}
          subtitle="comunicazioni inviate"
          icon={<Send size={22} />}
          colorType="primary"
        />
        <StatCard
          title="Questa Settimana"
          value={stats?.questa_settimana || 0}
          subtitle="totale settimanale"
          icon={<Calendar size={22} />}
          colorType="accent"
          trend={stats && stats.questa_settimana > 0 ? { value: 12, positive: true } : undefined}
        />
        <StatCard
          title="Tasso di Successo"
          value={analytics ? `${analytics.successRate}%` : '—'}
          subtitle={analytics ? `${stats?.inviati || 0} su ${analytics.totale}` : 'nessun dato'}
          icon={<Percent size={22} />}
          colorType="success"
        />
        <StatCard
          title="Compleanni Oggi"
          value={birthdaysToday.length}
          subtitle={upcomingBirthdays.length > 0 ? `+${upcomingBirthdays.length} prossimi 7gg` : 'nessuno in arrivo'}
          icon={<Cake size={22} />}
          colorType="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Analytics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Channel Distribution */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <BarChart3 size={18} style={{ color: 'var(--color-primary)' }} />
              Distribuzione per Canale
            </h3>

            {analytics && analytics.channelData.length > 0 ? (
              <div className="space-y-4">
                {analytics.channelData.map((channel) => (
                  <div key={channel.canale}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        {getChannelIcon(channel.canale)}
                        <span className="text-sm font-medium capitalize" style={{ color: 'var(--color-text-primary)' }}>
                          {channel.canale}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                          {channel.count}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {channel.percentage}%
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-2 rounded-full overflow-hidden"
                      style={{ background: 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${channel.percentage}%`,
                          background: channel.canale === 'whatsapp' ? '#25D366' : 'var(--color-accent)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 size={32} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Nessun dato disponibile
                </p>
              </div>
            )}
          </div>

          {/* Type Distribution */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
              <FileText size={18} style={{ color: 'var(--color-primary)' }} />
              Distribuzione per Tipo
            </h3>

            {analytics && analytics.typeData.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {analytics.typeData.map((type) => {
                  const typeLabels: Record<string, string> = {
                    reminder: 'Reminder',
                    birthday: 'Compleanno',
                    marketing: 'Marketing',
                    custom: 'Altro',
                  };
                  const typeColors: Record<string, string> = {
                    reminder: 'var(--color-primary)',
                    birthday: 'var(--color-warning)',
                    marketing: 'var(--color-accent)',
                    custom: 'var(--color-secondary)',
                  };

                  return (
                    <div
                      key={type.tipo}
                      className="rounded-xl p-4 text-center"
                      style={{
                        background: 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)',
                        border: '1px solid var(--glass-border)',
                      }}
                    >
                      <p className="text-2xl font-bold" style={{ color: typeColors[type.tipo] || 'var(--color-text-primary)' }}>
                        {type.count}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {typeLabels[type.tipo] || type.tipo}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText size={32} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                  Nessun dato disponibile
                </p>
              </div>
            )}
          </div>

          {/* Recent Messages */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--glass-border)' }}
            >
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <MessageSquare size={18} style={{ color: 'var(--color-primary)' }} />
                Messaggi Recenti
              </h3>
              <button
                className="text-sm font-medium flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: 'var(--color-primary)' }}
                onClick={() => handleTabChange('storico')}
              >
                Vedi tutti <ArrowRight size={14} />
              </button>
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
              {recentMessages.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare size={32} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Nessun messaggio recente
                  </p>
                </div>
              ) : (
                recentMessages.slice(0, 5).map((msg) => (
                  <div
                    key={msg.id}
                    className="px-5 py-3 flex items-center justify-between hover:opacity-90 transition-opacity"
                    style={{ background: 'transparent' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getChannelIcon(msg.canale, 18)}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--color-text-primary)' }}>
                          {msg.cliente_nome} {msg.cliente_cognome}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {msg.messaggio?.slice(0, 50)}...
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {getStatusBadge(msg.stato)}
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {new Date(msg.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Birthdays */}
        <div className="space-y-6">
          {/* Today's Birthdays */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div
              className="px-5 py-4"
              style={{
                borderBottom: '1px solid var(--glass-border)',
                background: 'color-mix(in srgb, var(--color-warning) 8%, transparent)',
              }}
            >
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Cake size={18} style={{ color: 'var(--color-warning)' }} />
                Compleanni Oggi
              </h3>
            </div>

            <div className="p-4">
              {birthdaysToday.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Nessun compleanno oggi
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {birthdaysToday.map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{
                        background: 'color-mix(in srgb, var(--color-warning) 10%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--color-warning) 20%, transparent)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                          style={{
                            background: 'var(--color-warning)',
                            color: 'white',
                          }}
                        >
                          {cliente.nome.charAt(0)}
                        </div>
                        <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                          {cliente.nome} {cliente.cognome}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          const channels = comunicazioniService.getAvailableChannels(cliente);
                          if (channels.length > 0) {
                            const canale = channels.includes('whatsapp') ? 'whatsapp' : channels[0];
                            await comunicazioniService.sendMessage(
                              canale,
                              cliente.cellulare || cliente.telefono || '',
                              `Tantissimi auguri di buon compleanno ${cliente.nome}! 🎂🎉`
                            );
                            showToast('Messaggio aperto!', 'success');
                          } else {
                            showToast('Nessun canale disponibile', 'error');
                          }
                        }}
                      >
                        <Send size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Birthdays */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div
              className="px-5 py-4"
              style={{ borderBottom: '1px solid var(--glass-border)' }}
            >
              <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                Prossimi 7 Giorni
              </h3>
            </div>

            <div className="p-4">
              {upcomingBirthdays.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    Nessun compleanno in arrivo
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingBirthdays.slice(0, 5).map((cliente) => (
                    <div
                      key={cliente.id}
                      className="flex items-center justify-between p-2 rounded-lg transition-colors"
                      style={{ background: 'color-mix(in srgb, var(--color-text-primary) 3%, transparent)' }}
                    >
                      <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
                        {cliente.nome} {cliente.cognome}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: 'color-mix(in srgb, var(--color-primary) 15%, transparent)',
                          color: 'var(--color-primary)',
                        }}
                      >
                        {cliente.data_nascita
                          ? new Date(cliente.data_nascita).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: 'short',
                            })
                          : '-'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Summary */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Riepilogo Rapido
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Totale inviati</span>
                <span className="font-semibold" style={{ color: 'var(--color-success)' }}>{stats?.inviati || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Errori</span>
                <span className="font-semibold" style={{ color: 'var(--color-danger)' }}>{stats?.errori || 0}</span>
              </div>
              <div
                className="pt-3 mt-3"
                style={{ borderTop: '1px solid var(--glass-border)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    Questo mese
                  </span>
                  <span className="font-bold text-lg" style={{ color: 'var(--color-primary)' }}>
                    {stats?.questo_mese || 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTemplates = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Template Messaggi
        </h3>
        <Button onClick={() => openTemplateModal()}>
          + Nuovo Template
        </Button>
      </div>

      <div
        className="rounded-xl p-4"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
        }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <strong>Placeholder:</strong> {'{nome}'}, {'{cognome}'}, {'{data_appuntamento}'}, {'{ora_appuntamento}'}, {'{trattamento}'}, {'{nome_centro}'}
        </p>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {templates.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={40} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3 opacity-50" />
            <p style={{ color: 'var(--color-text-secondary)' }}>Nessun template configurato</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Crea il tuo primo template per i messaggi
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {templates.map((template) => (
              <div
                key={template.id}
                className="p-4 transition-colors"
                style={{ background: 'transparent' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getChannelIcon(template.canale)}
                    <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {template.nome}
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)',
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      {template.tipo}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      [{template.codice}]
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: template.attivo
                          ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                          : 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)',
                        color: template.attivo ? 'var(--color-success)' : 'var(--color-text-muted)',
                      }}
                    >
                      {template.attivo ? 'Attivo' : 'Inattivo'}
                    </span>
                    <button
                      onClick={() => openTemplateModal(template)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Modifica"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-1.5 rounded-lg transition-colors"
                      style={{ color: 'var(--color-text-muted)' }}
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-sm line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {template.corpo}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderCampagne = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Campagne Marketing
        </h3>
        <Button onClick={() => showToast('Creazione campagna in sviluppo', 'success')}>
          + Nuova Campagna
        </Button>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {campagne.length === 0 ? (
          <div className="p-12 text-center">
            <Users size={40} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3 opacity-50" />
            <p style={{ color: 'var(--color-text-secondary)' }}>Nessuna campagna creata</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Crea la tua prima campagna marketing
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
            {campagne.map((campagna) => {
              const statusColors: Record<string, string> = {
                completata: 'var(--color-success)',
                in_corso: 'var(--color-accent)',
                bozza: 'var(--color-text-muted)',
                errore: 'var(--color-danger)',
              };
              const statusColor = statusColors[campagna.stato] || statusColors.bozza;

              return (
                <div key={campagna.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getChannelIcon(campagna.canale)}
                      <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {campagna.nome}
                      </span>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full capitalize"
                      style={{
                        background: `color-mix(in srgb, ${statusColor} 15%, transparent)`,
                        color: statusColor,
                      }}
                    >
                      {campagna.stato}
                    </span>
                  </div>
                  {campagna.descrizione && (
                    <p className="text-sm mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                      {campagna.descrizione}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Destinatari: {campagna.totale_destinatari}</span>
                    <span>Inviati: {campagna.inviati}</span>
                    <span>Errori: {campagna.errori}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const renderAutomazioni = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Automazioni
      </h3>

      {schedulerConfig ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reminder */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Calendar size={18} style={{ color: 'var(--color-primary)' }} />
                Reminder Appuntamenti
              </h4>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: schedulerConfig.reminder_enabled
                    ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                    : 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)',
                  color: schedulerConfig.reminder_enabled ? 'var(--color-success)' : 'var(--color-text-muted)',
                }}
              >
                {schedulerConfig.reminder_enabled ? 'Attivo' : 'Disattivo'}
              </span>
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p><strong>Ore prima:</strong> {schedulerConfig.reminder_hours_before}h</p>
              <p><strong>Canale:</strong> {schedulerConfig.reminder_default_channel}</p>
            </div>
          </div>

          {/* Birthday */}
          <div
            className="rounded-2xl p-5"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                <Cake size={18} style={{ color: 'var(--color-warning)' }} />
                Auguri Compleanno
              </h4>
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: schedulerConfig.birthday_enabled
                    ? 'color-mix(in srgb, var(--color-success) 15%, transparent)'
                    : 'color-mix(in srgb, var(--color-text-primary) 10%, transparent)',
                  color: schedulerConfig.birthday_enabled ? 'var(--color-success)' : 'var(--color-text-muted)',
                }}
              >
                {schedulerConfig.birthday_enabled ? 'Attivo' : 'Disattivo'}
              </span>
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <p><strong>Ora invio:</strong> {schedulerConfig.birthday_check_time}</p>
              <p><strong>Canale:</strong> {schedulerConfig.birthday_default_channel}</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--glass-border)',
          }}
        >
          <AlertCircle size={40} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3 opacity-50" />
          <p style={{ color: 'var(--color-text-muted)' }}>Caricamento configurazione...</p>
        </div>
      )}

      <div
        className="rounded-xl p-4"
        style={{
          background: 'color-mix(in srgb, var(--color-accent) 10%, transparent)',
          border: '1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)',
        }}
      >
        <div className="flex items-start gap-3">
          <AlertCircle size={18} style={{ color: 'var(--color-accent)' }} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            <p className="font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>Come funzionano</p>
            <p>
              I reminder vengono notificati quando l'app è aperta. Per WhatsApp, conferma manualmente l'invio.
              Per le email, configura le impostazioni SMTP in Settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStorico = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        Storico Comunicazioni
      </h3>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--glass-border)',
        }}
      >
        {recentMessages.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={40} style={{ color: 'var(--color-text-muted)' }} className="mx-auto mb-3 opacity-50" />
            <p style={{ color: 'var(--color-text-muted)' }}>Nessuna comunicazione inviata</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)' }}>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Canale
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Stato
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase" style={{ color: 'var(--color-text-muted)' }}>
                    Messaggio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--glass-border)' }}>
                {recentMessages.map((msg) => (
                  <tr key={msg.id}>
                    <td className="px-4 py-3 text-sm whitespace-nowrap" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(msg.created_at).toLocaleString('it-IT', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--color-text-primary)' }}>
                      {msg.cliente_nome} {msg.cliente_cognome}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(msg.canale)}
                        <span className="text-sm capitalize" style={{ color: 'var(--color-text-secondary)' }}>
                          {msg.canale}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm capitalize" style={{ color: 'var(--color-text-muted)' }}>
                      {msg.tipo}
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(msg.stato)}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {msg.messaggio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
    { id: 'templates' as const, label: 'Template', icon: FileText },
    { id: 'campagne' as const, label: 'Campagne', icon: Users },
    { id: 'automazioni' as const, label: 'Automazioni', icon: Settings },
    { id: 'storico' as const, label: 'Storico', icon: Clock },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Comunicazioni
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Gestisci messaggi, reminder e campagne marketing
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6" style={{ borderBottom: '1px solid var(--glass-border)' }}>
        <nav className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all border-b-2"
              style={{
                borderColor: activeTab === tab.id ? 'var(--color-primary)' : 'transparent',
                color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: activeTab === tab.id ? 'color-mix(in srgb, var(--color-primary) 5%, transparent)' : 'transparent',
              }}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2"
            style={{ borderColor: 'var(--glass-border)', borderTopColor: 'var(--color-primary)' }}
          />
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'templates' && renderTemplates()}
          {activeTab === 'campagne' && renderCampagne()}
          {activeTab === 'automazioni' && renderAutomazioni()}
          {activeTab === 'storico' && renderStorico()}
        </>
      )}

      {/* Template Modal */}
      <Modal
        isOpen={isTemplateModalOpen}
        onClose={closeTemplateModal}
        title={editingTemplate ? 'Modifica Template' : 'Nuovo Template'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Codice *"
              value={templateForm.codice}
              onChange={(e) => setTemplateForm({ ...templateForm, codice: e.target.value })}
              placeholder="es: reminder_whatsapp"
              disabled={!!editingTemplate}
            />
            <Input
              label="Nome *"
              value={templateForm.nome}
              onChange={(e) => setTemplateForm({ ...templateForm, nome: e.target.value })}
              placeholder="es: Reminder WhatsApp"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo *"
              value={templateForm.tipo}
              onChange={(e) => setTemplateForm({ ...templateForm, tipo: e.target.value as any })}
              disabled={!!editingTemplate}
            >
              <option value="reminder">Reminder</option>
              <option value="birthday">Compleanno</option>
              <option value="marketing">Marketing</option>
              <option value="custom">Personalizzato</option>
            </Select>

            <Select
              label="Canale *"
              value={templateForm.canale}
              onChange={(e) => setTemplateForm({ ...templateForm, canale: e.target.value as any })}
              disabled={!!editingTemplate}
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
            </Select>
          </div>

          {templateForm.canale === 'email' && (
            <Input
              label="Oggetto Email"
              value={templateForm.oggetto}
              onChange={(e) => setTemplateForm({ ...templateForm, oggetto: e.target.value })}
              placeholder="es: Promemoria appuntamento"
            />
          )}

          <Textarea
            label="Testo Messaggio *"
            value={templateForm.corpo}
            onChange={(e) => setTemplateForm({ ...templateForm, corpo: e.target.value })}
            rows={5}
            placeholder="Ciao {nome}! Ti ricordiamo l'appuntamento..."
          />

          <div
            className="rounded-lg p-3 text-sm"
            style={{
              background: 'color-mix(in srgb, var(--color-text-primary) 5%, transparent)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <strong>Placeholder:</strong>
            <div className="mt-2 flex flex-wrap gap-2">
              {['{nome}', '{cognome}', '{data_appuntamento}', '{ora_appuntamento}', '{trattamento}', '{nome_centro}'].map((ph) => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => setTemplateForm({ ...templateForm, corpo: templateForm.corpo + ' ' + ph })}
                  className="px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--glass-border)',
                    color: 'var(--color-text-primary)',
                  }}
                >
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {editingTemplate && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={templateForm.attivo}
                onChange={(e) => setTemplateForm({ ...templateForm, attivo: e.target.checked })}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Template attivo
              </span>
            </label>
          )}

          <div
            className="flex justify-end gap-3 pt-4"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <Button variant="secondary" onClick={closeTemplateModal} disabled={templateSaving}>
              Annulla
            </Button>
            <Button onClick={handleSaveTemplate} disabled={templateSaving}>
              {templateSaving ? (
                <>
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin mr-2"
                    style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}
                  />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  {editingTemplate ? 'Aggiorna' : 'Crea Template'}
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
