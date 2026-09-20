Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtener el directorio actual donde se encuentra instalado el sistema
strCurrentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Forzar a WshShell a ubicarse en la carpeta de la aplicacion (evita C:\Windows\system32)
WshShell.CurrentDirectory = strCurrentDir

' Ejecutar el servidor Node.js en segundo plano (0 = ventana completamente oculta, False = no esperar)
WshShell.Run "node """ & strCurrentDir & "\dist\server.cjs""", 0, False

' Esperar 2.0 segundos para que el servidor local inicialice
WScript.Sleep 2000

' Abrir el navegador en localhost:3000
WshShell.Run "http://localhost:3000"
