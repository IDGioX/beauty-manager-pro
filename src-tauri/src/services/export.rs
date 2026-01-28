// Service per generazione file export (Excel, PDF)

use crate::error::AppResult;
use crate::models::AppuntamentoWithDetails;
use chrono::{DateTime, Utc, Datelike};
use rust_xlsxwriter::{Workbook, Format, FormatAlign, Color as XlsxColor};
use printpdf::{PdfDocument, Mm, BuiltinFont};
use std::path::Path;
use std::fs::File;
use std::io::BufWriter;

/// Genera un file Excel con gli appuntamenti dell'agenda
pub fn generate_excel_agenda(
    appuntamenti: Vec<AppuntamentoWithDetails>,
    data_inizio: DateTime<Utc>,
    data_fine: DateTime<Utc>,
    output_path: &Path,
) -> AppResult<()> {
    // Crea workbook
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    // Formati celle
    let header_format = Format::new()
        .set_bold()
        .set_font_size(12)
        .set_background_color(XlsxColor::RGB(0x4472C4))
        .set_font_color(XlsxColor::White)
        .set_align(FormatAlign::Center);

    let currency_format = Format::new()
        .set_num_format("€ #,##0.00");

    // Header row - definisce le colonne
    let headers = [
        "Data",
        "Ora Inizio",
        "Ora Fine",
        "Operatrice",
        "Cliente",
        "Telefono",
        "Trattamento",
        "Durata (min)",
        "Prezzo",
        "Stato",
        "Note"
    ];

    // Scrive header
    for (col, header) in headers.iter().enumerate() {
        worksheet.write_string_with_format(0, col as u16, *header, &header_format)?;
    }

    // Imposta larghezza colonne
    worksheet.set_column_width(0, 12)?; // Data
    worksheet.set_column_width(1, 10)?; // Ora inizio
    worksheet.set_column_width(2, 10)?; // Ora fine
    worksheet.set_column_width(3, 20)?; // Operatrice
    worksheet.set_column_width(4, 25)?; // Cliente
    worksheet.set_column_width(5, 15)?; // Telefono
    worksheet.set_column_width(6, 30)?; // Trattamento
    worksheet.set_column_width(7, 12)?; // Durata
    worksheet.set_column_width(8, 12)?; // Prezzo
    worksheet.set_column_width(9, 15)?; // Stato
    worksheet.set_column_width(10, 40)?; // Note

    // Ordina appuntamenti per data/ora
    let mut sorted_apps = appuntamenti.clone();
    sorted_apps.sort_by_key(|a| a.data_ora_inizio);

    // Scrive dati appuntamenti
    for (i, app) in sorted_apps.iter().enumerate() {
        let row = (i + 1) as u32; // +1 perché row 0 è header

        // Data
        let data_str = app.data_ora_inizio.format("%d/%m/%Y").to_string();
        worksheet.write_string(row, 0, &data_str)?;

        // Ora inizio
        let ora_inizio_str = app.data_ora_inizio.format("%H:%M").to_string();
        worksheet.write_string(row, 1, &ora_inizio_str)?;

        // Ora fine
        let ora_fine_str = app.data_ora_fine.format("%H:%M").to_string();
        worksheet.write_string(row, 2, &ora_fine_str)?;

        // Operatrice
        worksheet.write_string(row, 3, &format!("{} {}", app.operatrice_cognome, app.operatrice_nome))?;

        // Cliente
        worksheet.write_string(row, 4, &format!("{} {}", app.cliente_cognome, app.cliente_nome))?;

        // Telefono
        worksheet.write_string(row, 5, app.cliente_cellulare.as_deref().unwrap_or("-"))?;

        // Trattamento
        worksheet.write_string(row, 6, &app.trattamento_nome)?;

        // Durata
        worksheet.write_number(row, 7, app.trattamento_durata as f64)?;

        // Prezzo
        if let Some(prezzo) = app.prezzo_applicato {
            worksheet.write_number_with_format(row, 8, prezzo, &currency_format)?;
        } else {
            worksheet.write_string(row, 8, "-")?;
        }

        // Stato
        worksheet.write_string(row, 9, &app.stato)?;

        // Note (combina note_prenotazione + note_trattamento)
        let note: String = match (&app.note_prenotazione, &app.note_trattamento) {
            (Some(n1), Some(n2)) => format!("{}\n{}", n1, n2),
            (Some(n), None) | (None, Some(n)) => n.to_string(),
            (None, None) => "-".to_string(),
        };
        worksheet.write_string(row, 10, &note)?;
    }

    // Freeze pane: blocca header
    worksheet.set_freeze_panes(1, 0)?;

    // Aggiungi filtri automatici
    if !sorted_apps.is_empty() {
        worksheet.autofilter(0, 0, sorted_apps.len() as u32, headers.len() as u16 - 1)?;
    }

    // Salva workbook
    workbook.save(output_path)?;

    Ok(())
}

/// Genera un file PDF con gli appuntamenti dell'agenda (layout lista)
pub fn generate_pdf_agenda(
    appuntamenti: Vec<AppuntamentoWithDetails>,
    data_inizio: DateTime<Utc>,
    data_fine: DateTime<Utc>,
    output_path: &Path,
) -> AppResult<()> {
    // Ordina appuntamenti per data/ora
    let mut sorted_apps = appuntamenti.clone();
    sorted_apps.sort_by_key(|a| a.data_ora_inizio);

    // Crea documento PDF (A4)
    let (doc, page1, layer1) = PdfDocument::new("Agenda", Mm(210.0), Mm(297.0), "Layer 1");
    let current_layer = doc.get_page(page1).get_layer(layer1);

    // Font
    let font = doc.add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| crate::error::AppError::Pdf(format!("Errore font: {:?}", e)))?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| crate::error::AppError::Pdf(format!("Errore font bold: {:?}", e)))?;

    let mut y_pos = 280.0; // Partenza dall'alto (A4 height = 297mm)

    // Titolo
    let title = format!(
        "AGENDA {} - {}",
        data_inizio.format("%d/%m/%Y"),
        data_fine.format("%d/%m/%Y")
    );
    current_layer.use_text(title, 14.0, Mm(20.0), Mm(y_pos), &font_bold);
    y_pos -= 10.0;

    // Raggruppa per giorno
    use std::collections::HashMap;
    let mut by_day: HashMap<String, Vec<&AppuntamentoWithDetails>> = HashMap::new();
    for app in &sorted_apps {
        let day_key = app.data_ora_inizio.format("%Y-%m-%d").to_string();
        by_day.entry(day_key).or_insert_with(Vec::new).push(app);
    }

    // Ordina giorni
    let mut days: Vec<String> = by_day.keys().cloned().collect();
    days.sort();

    for day_key in days {
        let apps = &by_day[&day_key];
        if apps.is_empty() {
            continue;
        }

        // Header giorno
        let first_app = apps[0];
        let weekday = get_italian_weekday(first_app.data_ora_inizio.weekday().num_days_from_monday());
        let day_header = format!(
            "{} {}",
            weekday.to_uppercase(),
            first_app.data_ora_inizio.format("%d/%m/%Y")
        );

        current_layer.use_text(day_header, 12.0, Mm(20.0), Mm(y_pos), &font_bold);
        y_pos -= 10.0;

        // Appuntamenti del giorno
        for app in apps {
            let time_range = format!(
                "{} - {}",
                app.data_ora_inizio.format("%H:%M"),
                app.data_ora_fine.format("%H:%M")
            );
            let operatrice = format!("{} {}", app.operatrice_cognome, app.operatrice_nome);
            let cliente = format!("{} {}", app.cliente_cognome, app.cliente_nome);

            let line_text = format!(
                "{} | {} | {} | Cliente: {}",
                time_range, operatrice, app.trattamento_nome, cliente
            );

            current_layer.use_text(line_text, 10.0, Mm(25.0), Mm(y_pos), &font);
            y_pos -= 6.0;
        }

        y_pos -= 5.0; // Spazio extra tra giorni
    }

    // Salva PDF
    doc.save(&mut BufWriter::new(File::create(output_path)?))
        .map_err(|e| crate::error::AppError::Pdf(format!("Errore salvataggio PDF: {:?}", e)))?;

    Ok(())
}

fn get_italian_weekday(day: u32) -> &'static str {
    match day {
        0 => "Lunedì",
        1 => "Martedì",
        2 => "Mercoledì",
        3 => "Giovedì",
        4 => "Venerdì",
        5 => "Sabato",
        6 => "Domenica",
        _ => "Sconosciuto",
    }
}
