pub mod cliente;
pub mod operatrice;
pub mod trattamento;
pub mod appuntamento;
pub mod prodotto;
pub mod magazzino;
pub mod azienda;
pub mod user;
pub mod export;
pub mod analytics;
pub mod license;
pub mod comunicazione;

pub use cliente::{Cliente, CreateClienteInput, UpdateClienteInput};
pub use operatrice::{Operatrice, CreateOperatriceInput, UpdateOperatriceInput};
pub use trattamento::{
    Trattamento, TrattamentoWithCategoria, CategoriaTrattamento,
    CreateTrattamentoInput, UpdateTrattamentoInput,
    CreateCategoriaTrattamentoInput, UpdateCategoriaTrattamentoInput
};
pub use appuntamento::{
    Appuntamento, AppuntamentoWithDetails,
    CreateAppuntamentoInput, UpdateAppuntamentoInput
};
pub use prodotto::Prodotto;
pub use magazzino::{
    CategoriaProdotto, CreateCategoriaProdottoInput, UpdateCategoriaProdottoInput,
    ProdottoWithCategoria, CreateProdottoInput, UpdateProdottoInput,
    MovimentoMagazzino, MovimentoWithDetails,
    CreateCaricoInput, CreateScaricoInput, CreateInventarioInput, CreateResoInput,
    FiltriMovimenti, AlertProdotto, AlertCount, ReportConsumiResult, ValoreMagazzino,
    // Inventario
    Inventario, RigaInventario, RigaInventarioWithProdotto,
    CreateSessioneInventarioInput, CreateRigaInventarioInput, UpdateRigaInventarioInput,
    InventarioRiepilogo
};
pub use azienda::{Azienda, UpdateAziendaInput};
pub use user::{
    User, UserSettings, UserSession,
    LoginInput, AuthResponse, CreateUserInput, UpdateUserInput, UpdateUserSettingsInput
};
pub use export::{ExportAgendaInput, ExportResult};
pub use analytics::*;
pub use license::{License, LicenseInfo, ValidationLog, GeneratedKey};
pub use comunicazione::{
    TemplateMesaggio, CreateTemplateInput, UpdateTemplateInput,
    Comunicazione, ComunicazioneWithCliente,
    ConfigSmtp, SaveSmtpConfigInput,
    ConfigScheduler, SaveSchedulerConfigInput,
    CampagnaMarketing, CreateCampagnaInput, CampagnaDestinatario,
    MessageLink, ComunicazioniStats, TipoCount, CanaleCount,
    FiltriComunicazioni, TargetFilters
};
