; =====================================================================
;   GastroLocal POS - Script de Instalador Inno Setup (.iss)
; =====================================================================

#define MyAppName "GastroLocal POS"
#define MyAppVersion "1.2.0"
#define MyAppPublisher "GastroLocal"
#define MyAppURL "http://localhost:8080/admin"
#define MyAppExeName "GastroLocal.exe"

[Setup]
AppId={{D4915F78-3F40-4B42-99B7-E8A731F894E2}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\GastroLocal
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir={#SourcePath}\Instalador_Salida
OutputBaseFilename=GastroLocal_Instalador_v1.2
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes
CloseApplications=yes
RestartApplications=no

[Dirs]
; Dar permisos totales a la carpeta para que la base de datos data.json y respaldos se guarden sin errores
Name: "{app}"; Permissions: users-full

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
; Acceso en el escritorio marcado por defecto
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "startupicon"; Description: "Iniciar GastroLocal automáticamente al encender la PC"; GroupDescription: "Opciones de Inicio:"; Flags: unchecked

[Files]
; Archivo ejecutable principal compilado con PyInstaller (garantiza inclusión desde dist\ o raíz del proyecto)
Source: "{#SourcePath}\dist\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
; Base de datos inicial y scripts de control
Source: "{#SourcePath}\data.json"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
Source: "{#SourcePath}\iniciar_sistema.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourcePath}\apagar_sistema.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#SourcePath}\iniciar_invisible.vbs"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Acceso directo en el menú de inicio (con WorkingDir explícito)
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Abrir Panel de Administrador (Navegador)"; Filename: "{#MyAppURL}"
Name: "{group}\Apagar Servidor GastroLocal"; Filename: "{app}\apagar_sistema.bat"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"; WorkingDir: "{app}"

; Acceso directo en el escritorio (con WorkingDir explícito)
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon

; Inicio automático de Windows (si el usuario marcó la casilla)
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: startupicon

[Run]
; Regla automática en el Firewall de Windows para permitir conexiones de tablets/meseros en la red local
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""GastroLocal POS Server"" dir=in action=allow program=""{app}\{#MyAppExeName}"" enable=yes"; Flags: runhidden
; Opción para ejecutar el programa al terminar la instalación
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; Limpiar regla de firewall al desinstalar
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""GastroLocal POS Server"""; Flags: runhidden

[Code]
// Cerrar proceso previo antes de instalar o desinstalar para evitar bloqueos
function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
begin
  Exec('taskkill.exe', '/F /IM GastroLocal.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;

function InitializeUninstall(): Boolean;
var
  ResultCode: Integer;
begin
  Exec('taskkill.exe', '/F /IM GastroLocal.exe', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  Result := True;
end;
