; =======================================================================
;                  ELENA PRO - SISTEMA DE GESTION FARMACEUTICA
;         SCRIPT PROFESIONAL DE INSTALACION COMPLETA Y RED (INNO SETUP)
; =======================================================================

#define RutaProyecto "C:\Users\144DG\antigravity\Elena-AI"

[Setup]
AppName=Elena PRO - Farmacia
AppVersion=1.0.0
AppPublisher=Elena AI Solutions
AppPublisherURL=https://github.com/jesuspolo1986/Elena-AI
DefaultDirName={autopf}\ElenaPRO
DefaultGroupName=Elena PRO - Farmacia
DisableProgramGroupPage=yes
SourceDir={#RutaProyecto}
OutputDir=Installer
OutputBaseFilename=ElenaPRO_Instalador_v1.0.0
Compression=lzma2/ultra64
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64
PrivilegesRequired=admin

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "Crear acceso directo en el Escritorio"; GroupDescription: "Accesos directos:"
Name: "stopicon"; Description: "Crear acceso directo para Apagar Elena PRO"; GroupDescription: "Accesos directos:"
Name: "firewall"; Description: "Configurar Firewall de Windows para Conexión de Celulares y PCs en Red (Puerto 3000)"; GroupDescription: "Configuración de Red Local:"

[Files]
; 1. Servidor Node.js y compilados de producción (dist/)
Source: "dist\*"; DestDir: "{app}\dist"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: ".env.example"; DestDir: "{app}"; DestName: ".env.example"; Flags: ignoreversion

; 2. Scripts de inicio, apagado y accesos directos
Source: "Abrir_Elena.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "iniciar_invisible.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "detener_sistema.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "apagar_sistema.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "iniciar_sistema.bat"; DestDir: "{app}"; Flags: ignoreversion

; 3. Modulo de base de datos local y dependencias (incluye qrcode y bonjour-service)
Source: "data\*"; DestDir: "{app}\data"; Flags: recursesubdirs createallsubdirs ignoreversion
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: recursesubdirs createallsubdirs ignoreversion

[Dirs]
; Permisos totales de lectura/escritura para la base de datos local
Name: "{app}\data"; Permissions: users-full

[Icons]
; Acceso directo principal en escritorio (Inicio en segundo plano)
Name: "{userdesktop}\Elena PRO - Farmacia"; Filename: "{app}\iniciar_invisible.vbs"; Tasks: desktopicon; WorkingDir: "{app}"
; Acceso directo auxiliar para abrir consola con logs
Name: "{userdesktop}\Elena PRO (Consola Visual)"; Filename: "{app}\Abrir_Elena.bat"; Tasks: desktopicon; WorkingDir: "{app}"
; Acceso directo para apagar el servidor
Name: "{userdesktop}\Elena PRO - Apagar Servidor"; Filename: "{app}\apagar_sistema.bat"; Tasks: stopicon; WorkingDir: "{app}"
Name: "{group}\Elena PRO - Farmacia"; Filename: "{app}\iniciar_invisible.vbs"; WorkingDir: "{app}"
Name: "{group}\Desinstalar Elena PRO"; Filename: "{uninstallexe}"

[Run]
; 1. Crear automáticamente el archivo .env de configuración si no existe
Filename: "{cmd}"; Parameters: "/c if not exist ""{app}\.env"" copy ""{app}\.env.example"" ""{app}\.env"""; Flags: runhidden

; 2. Regla automática en el Firewall de Windows (Abre el puerto 3000 para eliminar el Error -118 en celulares)
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""Elena PRO Server (Port 3000)"" dir=in action=allow protocol=TCP localport=3000"; Tasks: firewall; Flags: runhidden

; 3. Opción para iniciar el sistema inmediatamente al finalizar la instalación
Filename: "{app}\iniciar_invisible.vbs"; Description: "Iniciar Elena PRO en segundo plano ahora"; Flags: postinstall shellexec skipifsilent

[UninstallRun]
; Eliminar la regla del Firewall al desinstalar
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""Elena PRO Server (Port 3000)"""; Flags: runhidden
; Detener el servidor antes de remover archivos
Filename: "{app}\detener_sistema.bat"; Flags: runhidden
