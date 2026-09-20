; ==============================================================================
; SCRIPT DE COMPILACIÓN INNO SETUP - SISTEMA POS & GESTIÓN MULTI-TENANT
; Compatible con Inno Setup 6.x
; Ruta configurada: C:\Users\144DG\Downloads\elena-ai
; ==============================================================================

; Definición de la ruta raíz exacta de tu proyecto
#define AppSourcePath "C:\Users\144DG\Downloads\elena-ai"

#define MyAppName "Sistema POS Farmacia y Comercio"
#define MyAppVersion "2.5.0"
#define MyAppPublisher "Tu Empresa de Software"
#define MyAppURL "https://tusistema.com"

[Setup]
; Identificador único de la aplicación (GUID)
AppId={{C8E32D9A-4E90-4821-B835-901F12A6E941}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName=C:\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
CloseApplications=yes
RestartApplications=no

; Carpeta de salida donde se creará el archivo ejecutable instalador
OutputDir={#AppSourcePath}\Output
OutputBaseFilename=Instalador_SistemaPOS_v{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Iniciar automáticamente con Windows (en segundo plano)"; GroupDescription: "Opciones de inicio:"; Flags: unchecked

[Dirs]
Name: "{app}\data"; Permissions: users-full

[Files]
; Archivos empaquetados desde tu carpeta: C:\Users\144DG\Downloads\elena-ai
Source: "{#AppSourcePath}\dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#AppSourcePath}\package.json"; DestDir: "{app}"; Flags: ignoreversion; Permissions: users-full
Source: "{#AppSourcePath}\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs restartreplace; Excludes: "*.log,*.tmp"
Source: "{#AppSourcePath}\.env.example"; DestDir: "{app}"; DestName: ".env"; Flags: onlyifdoesntexist
Source: "{#AppSourcePath}\Iniciar_Silencioso.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Abrir_Elena.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Iniciar_ElenaPRO.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Cerrar_ElenaPRO.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\fijar_ip_estatica.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Habilitar_Red_Cajas.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Activar_Tunel_Web_Celulares.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Crear_Acceso_Caja.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Instalar_Tunel_Fijo_Servicio.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppSourcePath}\Iniciar_Tunel_Fijo_LocalXpose.bat"; DestDir: "{app}"; Flags: ignoreversion

[Code]
// Función que cierra automáticamente cualquier servidor anterior en ejecución antes de instalar
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  // Cerrar procesos node.exe en segundo plano para liberar archivos bloqueados
  Exec('taskkill.exe', '/F /IM node.exe /T', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;

[Icons]
; Lanzador principal en modo silencioso (sin ventana negra de CMD)
Name: "{group}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\Iniciar_Silencioso.vbs"""; WorkingDir: "{app}"; IconFilename: "{sys}\shell32.dll"; IconIndex: 13
Name: "{group}\Conectar Celulares (Tunel Web)"; Filename: "{app}\Activar_Tunel_Web_Celulares.bat"; WorkingDir: "{app}"
Name: "{group}\Habilitar Red y Cajas"; Filename: "{app}\Habilitar_Red_Cajas.bat"; WorkingDir: "{app}"
Name: "{group}\Cerrar Sistema POS"; Filename: "{app}\Cerrar_ElenaPRO.bat"; WorkingDir: "{app}"
Name: "{group}\Fijar IP Estatica"; Filename: "{app}\fijar_ip_estatica.bat"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\Iniciar_Silencioso.vbs"""; WorkingDir: "{app}"; Tasks: desktopicon; IconFilename: "{sys}\shell32.dll"; IconIndex: 13
Name: "{autodesktop}\Conectar Celulares (Tunel Web)"; Filename: "{app}\Activar_Tunel_Web_Celulares.bat"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "wscript.exe"; Parameters: """{app}\Iniciar_Silencioso.vbs"""; WorkingDir: "{app}"; Tasks: startupicon

[Run]
; 1. Abrir automáticamente el puerto 3000 en el Firewall de Windows en silencio
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""Elena PRO POS - Servidor Puerto 3000"" dir=in action=allow protocol=TCP localport=3000 profile=any"; Flags: runhidden
; 2. Habilitar regla global de Node.js en el Firewall
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""Elena PRO POS - Node Service"" dir=in action=allow program=""node.exe"" enable=yes profile=any"; Flags: runhidden
; 3. Cambiar perfil de red a Privada y activar detección de redes para que otras cajas vean el servidor
Filename: "powershell.exe"; Parameters: "-NoProfile -ExecutionPolicy Bypass -Command ""Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction SilentlyContinue"""; Flags: runhidden
; 4. Iniciar el servidor silencioso en segundo plano
Filename: "wscript.exe"; Parameters: """{app}\Iniciar_Silencioso.vbs"""; Flags: nowait
; 5. Abrir el navegador en localhost:3000 tras completar la instalación
Filename: "http://localhost:3000"; Description: "Abrir Sistema POS en el Navegador"; Flags: postinstall shellexec skipifsilent
