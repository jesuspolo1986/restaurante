' =======================================================================
'                  ELENA PRO - SISTEMA DE GESTION FARMACEUTICA
'                     SCRIPT DE INICIO SILENCIOSO (INVISIBLE)
' =======================================================================
' Este script ejecuta el archivo "iniciar_sistema.bat" en segundo plano
' ocultando por completo la ventana de comandos de Windows (cmd.exe).
'
' INSTRUCCIONES DE USO:
' 1. Cree un acceso directo a este archivo "iniciar_invisible.vbs" en el Escritorio.
' 2. Personalice el icono del acceso directo (Ej. con un icono de Farmacia).
' 3. Al hacer doble clic, el sistema se iniciará silenciosamente.

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
strPath = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.Run chr(34) & strPath & "\iniciar_sistema.bat" & Chr(34), 0
Set WshShell = Nothing
Set fso = Nothing
