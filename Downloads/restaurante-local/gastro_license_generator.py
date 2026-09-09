#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
GastroLocal - Generador de Códigos de Activación Mensual 🔑
Este script permite al desarrollador (tú) generar los códigos de activación 
mensuales de forma 100% offline, segura y ahora de forma ultra visual para tus clientes.

Uso:
  - Simplemente ejecútalo haciendo doble clic o con 'python gastro_license_generator.py' 
    para abrir la hermosa aplicación gráfica.
  - O úsalo en consola pasándole argumentos:
    python3 gastro_license_generator.py --id GL-XXXX-XXXX --period 2026-08
"""

import sys
import hashlib
import argparse
from datetime import datetime

# Debe coincidir EXACTAMENTE con el salt del servidor del cliente
SECRET_LICENSE_SALT = "GASTRO_OFFLINE_SECRET_2026_PRO"

MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
]

def generate_activation_code(installation_id, target_period):
    # target_period es como "2026-08"
    input_str = f"{installation_id}:{target_period}:{SECRET_LICENSE_SALT}"
    return hashlib.sha256(input_str.encode("utf-8")).hexdigest()[:8].upper()

def parse_period_name(period_str):
    try:
        y, m = map(int, period_str.split("-"))
        if 1 <= m <= 12:
            return f"{MESES[m-1]} {y}"
    except Exception:
        pass
    return period_str

def run_gui():
    """
    Inicia la hermosa interfaz de escritorio usando Tkinter estándar.
    No requiere instalar librerías externas (cero dependencias).
    """
    try:
        import tkinter as tk
        from tkinter import ttk, messagebox
        import urllib.parse
        import webbrowser
    except ImportError:
        print("⚠️ No se pudo cargar la librería gráfica 'tkinter'.")
        return False

    class GastroLicenseApp:
        def __init__(self, root):
            self.root = root
            self.root.title("GastroLocal - Generador de Activaciones 🔑")
            self.root.geometry("560x520")
            self.root.configure(bg="#0B0F19")
            self.root.resizable(False, False)

            # Intentar centrar la ventana en la pantalla
            try:
                screen_width = self.root.winfo_screenwidth()
                screen_height = self.root.winfo_screenheight()
                x = (screen_width - 560) // 2
                y = (screen_height - 520) // 2
                self.root.geometry(f"560x520+{x}+{y}")
            except Exception:
                pass

            # Paleta de colores Premium (Modo Oscuro)
            self.bg_dark = "#0B0F19"
            self.bg_card = "#161B2C"
            self.accent = "#6366F1"
            self.accent_hover = "#4F46E5"
            self.text_light = "#F3F4F6"
            self.text_muted = "#9CA3AF"
            self.success = "#10B981"

            # Fuentes de diseño
            self.font_title = ("Segoe UI", 16, "bold")
            self.font_subtitle = ("Segoe UI", 9)
            self.font_bold = ("Segoe UI", 11, "bold")
            self.font_mono = ("Consolas", 14, "bold")
            self.font_mono_lg = ("Consolas", 24, "bold")

            self.create_widgets()
            self.load_months()

        def create_widgets(self):
            # Contenedor principal con margen interno
            main_frame = tk.Frame(self.root, bg=self.bg_dark, padx=25, pady=20)
            main_frame.pack(fill="both", expand=True)

            # Cabecera / Marca
            header_frame = tk.Frame(main_frame, bg=self.bg_dark)
            header_frame.pack(fill="x", pady=(0, 15))

            lbl_title = tk.Label(
                header_frame, 
                text="🔑 GASTROLOCAL LICENSER", 
                font=("Segoe UI", 16, "bold"), 
                fg="#A78BFA", 
                bg=self.bg_dark
            )
            lbl_title.pack(anchor="w")

            lbl_subtitle = tk.Label(
                header_frame, 
                text="Generador Offline de Códigos de Activación Mensual para Servidores Locales", 
                font=self.font_subtitle, 
                fg=self.text_muted, 
                bg=self.bg_dark
            )
            lbl_subtitle.pack(anchor="w", pady=(2, 0))

            # Separador fino elegante
            sep = tk.Frame(main_frame, height=1, bg="#1F2937")
            sep.pack(fill="x", pady=(0, 15))

            # Formulario de Entrada (Tarjeta con fondo ligeramente claro)
            form_frame = tk.Frame(main_frame, bg=self.bg_card, padx=20, pady=20)
            form_frame.pack(fill="x")

            # Entrada para ID de Instalación del Cliente
            lbl_id = tk.Label(form_frame, text="ID de Instalación del Cliente:", font=self.font_bold, fg=self.text_light, bg=self.bg_card)
            lbl_id.pack(anchor="w", pady=(0, 5))

            self.entry_id_var = tk.StringVar()
            self.entry_id = tk.Entry(
                form_frame, 
                textvariable=self.entry_id_var, 
                font=self.font_mono, 
                bg="#0F172A", 
                fg="#818CF8", 
                insertbackground="white", 
                bd=0, 
                highlightbackground="#334155", 
                highlightthickness=1,
                justify="center"
            )
            self.entry_id.pack(fill="x", ipady=8, pady=(0, 15))
            self.entry_id.bind("<KeyRelease>", self.on_fields_changed)

            # Contenedor para dos columnas (Mes de Activación y Código Rápido)
            row_frame = tk.Frame(form_frame, bg=self.bg_card)
            row_frame.pack(fill="x")

            # Columna izquierda: Mes de Activación
            col_left = tk.Frame(row_frame, bg=self.bg_card)
            col_left.pack(side="left", fill="x", expand=True, padx=(0, 10))

            lbl_period = tk.Label(col_left, text="Mes a Activar:", font=self.font_bold, fg=self.text_light, bg=self.bg_card)
            lbl_period.pack(anchor="w", pady=(0, 5))

            # Configuración estética de Combobox
            style = ttk.Style()
            try:
                style.theme_use('clam')
            except Exception:
                pass
            style.configure(
                "TCombobox", 
                fieldbackground="#0F172A", 
                background="#1E293B", 
                foreground="#F3F4F6", 
                selectbackground="#6366F1", 
                font=("Segoe UI", 10, "bold")
            )
            
            self.combo_period = ttk.Combobox(col_left, state="readonly")
            self.combo_period.pack(fill="x", ipady=5)
            self.combo_period.bind("<<ComboboxSelected>>", self.on_fields_changed)

            # Tarjeta de Código de Activación Resultante
            self.res_frame = tk.Frame(main_frame, bg="#0F172A", padx=15, pady=15)
            self.res_frame.pack(fill="x", pady=15)

            lbl_res_title = tk.Label(self.res_frame, text="CÓDIGO DE ACTIVACIÓN MENSUAL", font=("Segoe UI", 9, "bold"), fg=self.text_muted, bg="#0F172A")
            lbl_res_title.pack(anchor="center")

            self.code_var = tk.StringVar(value="--------")
            self.lbl_code = tk.Label(self.res_frame, textvariable=self.code_var, font=self.font_mono_lg, fg="#F43F5E", bg="#0F172A")
            self.lbl_code.pack(anchor="center", pady=5)

            # Botones de Acción (Copiar / WhatsApp)
            actions_frame = tk.Frame(self.res_frame, bg="#0F172A")
            actions_frame.pack(fill="x", pady=(5, 0))

            self.btn_copy = tk.Button(
                actions_frame, 
                text="📋 Copiar Código", 
                command=self.copiar_codigo, 
                bg="#334155", 
                fg=self.text_light, 
                activebackground="#475569", 
                activeforeground="white", 
                font=self.font_bold, 
                bd=0, 
                cursor="hand2", 
                padx=10, 
                pady=6
            )
            self.btn_copy.pack(side="left", expand=True, fill="x", padx=(0, 5))

            self.btn_whatsapp = tk.Button(
                actions_frame, 
                text="💬 WhatsApp al Cliente", 
                command=self.compartir_whatsapp, 
                bg="#059669", 
                fg="white", 
                activebackground="#047857", 
                activeforeground="white", 
                font=self.font_bold, 
                bd=0, 
                cursor="hand2", 
                padx=10, 
                pady=6
            )
            self.btn_whatsapp.pack(side="right", expand=True, fill="x", padx=(5, 0))

            # Pie de pestaña para Calendario Completo
            toggle_frame = tk.Frame(main_frame, bg=self.bg_dark)
            toggle_frame.pack(fill="x", pady=(5, 5))

            self.btn_toggle_multi = tk.Button(
                toggle_frame, 
                text="📅 Generar Calendario Completo (12 Meses) ▼", 
                command=self.toggle_multi, 
                bg=self.bg_dark, 
                fg="#A78BFA", 
                activebackground=self.bg_dark, 
                activeforeground="#C084FC", 
                font=("Segoe UI", 10, "bold", "underline"), 
                bd=0, 
                cursor="hand2"
            )
            self.btn_toggle_multi.pack(anchor="center")

            # Frame para el calendario de 12 meses (inicialmente oculto)
            self.multi_frame = tk.Frame(main_frame, bg=self.bg_card, padx=10, pady=10)
            self.multi_visible = False

            # Contenedor para tabla
            self.tree_scroll = tk.Scrollbar(self.multi_frame)
            self.tree = ttk.Treeview(self.multi_frame, columns=("Periodo", "Codigo"), show="headings", yscrollcommand=self.tree_scroll.set, height=5)
            self.tree_scroll.config(command=self.tree.yview)

            self.tree.heading("Periodo", text="Período / Mes")
            self.tree.heading("Codigo", text="Código de Activación")
            self.tree.column("Periodo", width=220, anchor="center")
            self.tree.column("Codigo", width=180, anchor="center")

            # Estilo para la tabla de meses
            style.configure("TreeviewHeading", background="#1E293B", foreground="#F3F4F6", font=("Segoe UI", 9, "bold"))
            style.configure("Treeview", background="#0F172A", fieldbackground="#0F172A", foreground="#F3F4F6", rowheight=24, font=("Segoe UI", 9))
            
            # Copiar al hacer doble clic en una fila de la tabla
            self.tree.bind("<Double-1>", self.on_tree_double_click)

        def load_months(self):
            now = datetime.now()
            self.months_data = []
            combo_values = []

            for i in range(12):
                m = now.month + i
                y = now.year
                if m > 12:
                    m -= 12
                    y += 1
                
                val_str = f"{y:04d}-{m:02d}"
                display_str = f"{MESES[m-1]} {y}"
                self.months_data.append((val_str, display_str))
                combo_values.append(display_str)

            self.combo_period["values"] = combo_values
            self.combo_period.current(0)
            self.on_fields_changed()

        def on_fields_changed(self, *args):
            raw_id = self.entry_id_var.get().strip().upper()
            
            if not raw_id:
                self.code_var.set("--------")
                self.lbl_code.config(fg="#F43F5E")
                return

            idx = self.combo_period.current()
            if idx >= 0:
                period_str = self.months_data[idx][0]
                code = generate_activation_code(raw_id, period_str)
                self.code_var.set(code)
                self.lbl_code.config(fg="#10B981") # verde brillante
                
                if self.multi_visible:
                    self.update_multi_table(raw_id)

        def update_multi_table(self, installation_id):
            # Limpiar tabla primero
            for row in self.tree.get_children():
                self.tree.delete(row)

            for val_str, display_str in self.months_data:
                code = generate_activation_code(installation_id, val_str)
                self.tree.insert("", "end", values=(display_str, code))

        def toggle_multi(self):
            raw_id = self.entry_id_var.get().strip().upper()
            if not raw_id:
                messagebox.showwarning("Atención", "Por favor, ingresa el ID de instalación primero.")
                return

            if self.multi_visible:
                # Ocultar tabla
                self.multi_frame.pack_forget()
                self.btn_toggle_multi.config(text="📅 Generar Calendario Completo (12 Meses) ▼")
                self.root.geometry("560x520")
                self.multi_visible = False
            else:
                # Mostrar tabla
                self.root.geometry("560x730")
                self.multi_frame.pack(fill="both", expand=True, pady=(5, 10))
                self.tree.pack(side="left", fill="both", expand=True)
                self.tree_scroll.pack(side="right", fill="y")
                
                self.update_multi_table(raw_id)
                self.btn_toggle_multi.config(text="Ocultar Calendario Completo ▲")
                self.multi_visible = True

        def copiar_codigo(self):
            code = self.code_var.get()
            if code == "--------":
                messagebox.showwarning("Atención", "No hay código para copiar. Escribe una ID de instalación válida primero.")
                return

            self.root.clipboard_clear()
            self.root.clipboard_append(code)
            self.root.update()
            
            # Cambiar texto para dar feedback visual
            prev_text = self.btn_copy.cget("text")
            self.btn_copy.config(text="✓ ¡Código Copiado!", bg="#10B981")
            self.root.after(1500, lambda: self.btn_copy.config(text=prev_text, bg="#334155"))

        def on_tree_double_click(self, event):
            item = self.tree.selection()
            if not item:
                return
            values = self.tree.item(item, "values")
            if values:
                period_name, code = values
                self.root.clipboard_clear()
                self.root.clipboard_append(code)
                self.root.update()
                messagebox.showinfo("Copiado", f"Código {code} ({period_name}) copiado al portapapeles con éxito.")

        def compartir_whatsapp(self):
            code = self.code_var.get()
            raw_id = self.entry_id_var.get().strip().upper()
            if code == "--------" or not raw_id:
                messagebox.showwarning("Atención", "Genera un código de activación antes de enviarlo por WhatsApp.")
                return

            idx = self.combo_period.current()
            display_str = self.months_data[idx][1]
            
            text_msg = (
                f"¡Hola! Tu código de activación mensual para GastroLocal ya está listo:\n\n"
                f"👤 *ID de Instalación:* {raw_id}\n"
                f"📅 *Mes Activado:* {display_str}\n"
                f"🔑 *Código de Activación:* `{code}`\n\n"
                f"Escribe este código de 8 caracteres en la pantalla de bloqueo de tu servidor local para reactivar el sistema por completo.\n\n"
                f"¡Gracias por tu preferencia! 😊"
            )
            
            url = f"https://wa.me/?text={urllib.parse.quote(text_msg)}"
            try:
                webbrowser.open(url)
            except Exception:
                messagebox.showerror("Error", "No se pudo abrir el navegador de forma automática.")

    root = None
    try:
        root = tk.Tk()
        app = GastroLicenseApp(root)
        root.mainloop()
        return True
    except Exception as e:
        import traceback
        print("\n⚠️ ERROR AL INICIAR LA INTERFAZ GRÁFICA (GUI):")
        print("-" * 60)
        traceback.print_exc()
        print("-" * 60)
        print("Tratando de cerrar ventanas colgadas y cayendo en modo Consola...\n")
        try:
            if root:
                root.destroy()
        except Exception:
            pass
        return False

def main():
    parser = argparse.ArgumentParser(description="Generador de Códigos de Licencia para GastroLocal")
    parser.add_argument("--id", help="ID de Instalación del Cliente (ej. GL-A3B9-F28C)")
    parser.add_argument("--period", help="Período a activar en formato YYYY-MM (ej. 2026-08)")
    parser.add_argument("--multi", action="store_true", help="Generar los próximos 12 meses para esta ID")
    
    args = parser.parse_args()

    # Si se pasan parámetros de terminal, usar directamente el modo consola
    if args.id or args.period or args.multi:
        run_terminal_mode(args)
        return

    # Si se corre sin argumentos, intentar abrir la hermosa interfaz visual (GUI)
    # Si falla o no hay display, caemos de forma elegante al modo interactivo de terminal
    if not run_gui():
        run_terminal_interactive_fallback()

def run_terminal_mode(args):
    # Validar ID
    installation_id = args.id.strip().upper() if args.id else ""
    if not installation_id:
        print("❌ Error: Es obligatorio especificar una ID de instalación (--id).")
        return
        
    if args.multi:
        print(f"\nGenerando calendario de activación de 12 meses para el ID: {installation_id}\n")
        print("-" * 65)
        print(f" {'Período / Mes':<25} | {'Formato API':<15} | {'Código de Activación':<20}")
        print("-" * 65)
        
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        
        for i in range(12):
            m = current_month + i
            y = current_year
            if m > 12:
                m -= 12
                y += 1
            
            period_str = f"{y:04d}-{m:02d}"
            code = generate_activation_code(installation_id, period_str)
            month_name = f"{MESES[m-1]} {y}"
            
            print(f" {month_name:<25} | {period_str:<15} | {code:<20}")
        print("-" * 65)
    
    elif args.period:
        period_str = args.period.strip()
        code = generate_activation_code(installation_id, period_str)
        month_friendly = parse_period_name(period_str)
        
        print(f"\n✅ CÓDIGO GENERADO CON ÉXITO:")
        print("-" * 65)
        print(f"  👤 ID de Cliente:       {installation_id}")
        print(f"  📅 Período / Mes:       {month_friendly} ({period_str})")
        print(f"  🔑 CÓDIGO DE ACTIVACIÓN:  {code}")
        print("-" * 65)
    
    else:
        # Mes actual por defecto
        now = datetime.now()
        period_str = f"{now.year:04d}-{now.month:02d}"
        code = generate_activation_code(installation_id, period_str)
        month_friendly = parse_period_name(period_str)
        
        print(f"\n✅ CÓDIGO PARA EL MES ACTUAL ({month_friendly}):")
        print("-" * 65)
        print(f"  👤 ID de Cliente:       {installation_id}")
        print(f"  📅 Período / Mes:       {month_friendly} ({period_str})")
        print(f"  🔑 CÓDIGO DE ACTIVACIÓN:  {code}")
        print("-" * 65)

def run_terminal_interactive_fallback():
    print("=" * 65)
    print("      GASTROLOCAL - GENERADOR OFFLINE DE CÓDIGOS DE ACTIVACIÓN 🔑")
    print("=" * 65)
    print("\n--- MODO INTERACTIVO (Consola) ---")
    try:
        client_id = input("👉 Ingrese el ID de Instalación del Cliente (ej. GL-A1B2-C3D4): ").strip().upper()
        if not client_id:
            print("❌ Error: El ID de Instalación no puede estar vacío.")
            return
        
        opcion = input("❓ ¿Desea generar (1) Un período específico o (2) El calendario de los próximos 12 meses? [1/2]: ").strip()
        
        if opcion == "2":
            class ArgsMock:
                id = client_id
                period = None
                multi = True
            run_terminal_mode(ArgsMock())
        else:
            periodo = input("👉 Ingrese el período a activar (Formato YYYY-MM, ej. 2026-08): ").strip()
            if not periodo or len(periodo) != 7 or "-" not in periodo:
                print("❌ Error: Formato de período inválido (Debe ser YYYY-MM, ej. 2026-08).")
                return
            class ArgsMock:
                id = client_id
                period = periodo
                multi = False
            run_terminal_mode(ArgsMock())
    except KeyboardInterrupt:
        print("\nOperación cancelada.")
        return
    print("=" * 65)

if __name__ == "__main__":
    main()
