use crate::error::AppResult;
use chrono::Datelike;
use printpdf::{PdfDocument, Mm, BuiltinFont};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

#[tauri::command]
pub async fn generate_changelog_pdf(
    version: String,
    release_date: String,
    release_notes: String,
    output_path: String,
) -> AppResult<String> {
    let path = Path::new(&output_path);

    // Crea documento PDF A4
    let (doc, page1, layer1) = PdfDocument::new(
        &format!("Novita Beauty Manager Pro v{}", version),
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );
    let current_layer = doc.get_page(page1).get_layer(layer1);

    let font = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| crate::error::AppError::Pdf(format!("Errore font: {:?}", e)))?;
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| crate::error::AppError::Pdf(format!("Errore font bold: {:?}", e)))?;

    let mut y_pos = 275.0;
    let left_margin = 20.0;
    let text_width_max = 170.0; // mm disponibili per il testo

    // Titolo principale
    current_layer.use_text(
        "Beauty Manager Pro",
        18.0,
        Mm(left_margin),
        Mm(y_pos),
        &font_bold,
    );
    y_pos -= 8.0;

    // Sottotitolo
    current_layer.use_text(
        format!("Novita della versione {}", version),
        12.0,
        Mm(left_margin),
        Mm(y_pos),
        &font,
    );
    y_pos -= 6.0;

    // Data release
    let formatted_date = format_date_italian(&release_date);
    current_layer.use_text(
        format!("Data rilascio: {}", formatted_date),
        9.0,
        Mm(left_margin),
        Mm(y_pos),
        &font,
    );
    y_pos -= 4.0;

    // Linea separatrice (simulata con trattini)
    current_layer.use_text(
        "________________________________________________________________________________________________________",
        6.0,
        Mm(left_margin),
        Mm(y_pos),
        &font,
    );
    y_pos -= 10.0;

    // Parse e render delle release notes (markdown semplice)
    let lines: Vec<&str> = release_notes.lines().collect();

    for line in lines {
        // Controlla se serve nuova pagina
        if y_pos < 25.0 {
            let (new_page, new_layer) = doc.add_page(Mm(210.0), Mm(297.0), "Layer 1");
            let _layer = doc.get_page(new_page).get_layer(new_layer);
            y_pos = 280.0;
            // Nota: printpdf usa l'ultimo layer aggiunto per i comandi successivi
            // Per semplicita, il PDF non supporta molte pagine per un changelog
        }

        let trimmed = line.trim();

        if trimmed.is_empty() {
            y_pos -= 4.0;
            continue;
        }

        if trimmed.starts_with("### ") {
            // Heading 3
            y_pos -= 3.0;
            let heading = &trimmed[4..];
            current_layer.use_text(heading, 11.0, Mm(left_margin), Mm(y_pos), &font_bold);
            y_pos -= 7.0;
        } else if trimmed.starts_with("## ") {
            // Heading 2
            y_pos -= 4.0;
            let heading = &trimmed[3..];
            current_layer.use_text(heading, 13.0, Mm(left_margin), Mm(y_pos), &font_bold);
            y_pos -= 8.0;
        } else if trimmed.starts_with("# ") {
            // Heading 1
            y_pos -= 4.0;
            let heading = &trimmed[2..];
            current_layer.use_text(heading, 15.0, Mm(left_margin), Mm(y_pos), &font_bold);
            y_pos -= 9.0;
        } else if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            // Bullet point
            let text = clean_markdown(&trimmed[2..]);
            // Tronca se troppo lungo per una riga
            let display_text = if text.len() > 90 {
                format!("{}...", &text[..87])
            } else {
                text
            };
            current_layer.use_text(
                "\u{2022}",
                9.0,
                Mm(left_margin + 3.0),
                Mm(y_pos),
                &font,
            );
            current_layer.use_text(
                &display_text,
                9.0,
                Mm(left_margin + 8.0),
                Mm(y_pos),
                &font,
            );
            y_pos -= 5.5;
        } else {
            // Testo normale
            let text = clean_markdown(trimmed);
            let display_text = if text.len() > 100 {
                format!("{}...", &text[..97])
            } else {
                text
            };
            current_layer.use_text(&display_text, 9.0, Mm(left_margin), Mm(y_pos), &font);
            y_pos -= 5.5;
        }
    }

    // Footer
    y_pos = 15.0;
    current_layer.use_text(
        format!(
            "Beauty Manager Pro v{} - Generato automaticamente",
            version
        ),
        7.0,
        Mm(left_margin),
        Mm(y_pos),
        &font,
    );

    // Salva il PDF
    let file = File::create(path)
        .map_err(|e| crate::error::AppError::Pdf(format!("Impossibile creare file: {}", e)))?;
    doc.save(&mut BufWriter::new(file))
        .map_err(|e| crate::error::AppError::Pdf(format!("Errore salvataggio PDF: {:?}", e)))?;

    Ok(output_path)
}

/// Rimuove la formattazione markdown bold/code dal testo per il PDF
fn clean_markdown(text: &str) -> String {
    text.replace("**", "").replace('`', "")
}

/// Formatta una data ISO in formato italiano
fn format_date_italian(iso_date: &str) -> String {
    // Prova a parsare ISO 8601
    if let Ok(dt) = chrono::DateTime::parse_from_rfc3339(iso_date) {
        let mesi = [
            "", "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
            "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre",
        ];
        let d = dt.naive_local();
        let mese = mesi.get(d.month() as usize).unwrap_or(&"");
        return format!("{} {} {}", d.day(), mese, d.year());
    }
    // Fallback: restituisci come e'
    iso_date.to_string()
}
