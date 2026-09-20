; =====================================================================
; SCRIPT DE INSTALACIÓN INNO SETUP - ELENA PRO SISTEMA POS & GESTIÓN
; =====================================================================

#define MyAppName "Elena PRO"
#define MyAppVersion "2.5.0"
#define MyAppPublisher "Elena Systems"
#define MyAppURL "https://elenapro.com"
#define MyAppExeName "Iniciar_ElenaPRO.bat"

; Ruta exacta de tu proyecto en la computadora:
#define MyProjectRoot "C:\Users\144DG\Downloads\elena-ai"

[Setup]
AppId={{E8B76F12-9A4C-4B7D-B3E1-729864C09F21}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} v{#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\ElenaPRO
DefaultGroupName={#MyAppName}
AllowNoIcons=yes

; Especificamos a Inno Setup el directorio raíz de los archivos:
SourceDir={#MyProjectRoot}

; Carpeta de salida del instalador compilado:
OutputDir={#MyProjectRoot}\Instalador_Salida
OutputBaseFilename=ElenaPRO_Setup_v2.5
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
DisableProgramGroupPage=yes

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: checkedonce
Name: "startupicon"; Description: "Iniciar Elena PRO con Windows al encender el equipo"; GroupDescription: "Opciones de Inicio:"; Flags: unchecked

[Files]
; 1. Carpeta compilada dist
Source: "dist\*"; DestDir: "{app}\dist"; Flags: ignoreversion recursesubdirs createallsubdirs

; 2. Archivos auxiliares del sistema
Source: "package.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "Iniciar_ElenaPRO.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "Cerrar_ElenaPRO.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\Cerrar Servidor {#MyAppName}"; Filename: "{app}\Cerrar_ElenaPRO.bat"; WorkingDir: "{app}"
Name: "{group}\Desinstalar {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; WorkingDir: "{app}"
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon; WorkingDir: "{app}"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall skipifsilent nowait

[UninstallDelete]
Type: filesandordirs; Name: "{app}\elena_server.log"

[Code]
function IsNodeInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd.exe', '/c node -v', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  if not IsNodeInstalled() then
  begin
    MsgBox('Aviso: No se detectó Node.js instalado en el sistema.' + #13#10 + #13#10 +
           'Elena PRO requiere Node.js (v18 o superior) para ejecutar el servidor local.' + #13#10 +
           'Por favor descargue e instale Node.js desde https://nodejs.org si aún no lo tiene.', mbInformation, MB_OK);
  end;
end;
