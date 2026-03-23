@echo off
REM Execute como Administrador: clique direito neste arquivo > Executar como administrador
REM Libera as portas 3000 e 3002 para o Rayo Hub funcionar na rede local

netsh advfirewall firewall add rule name="Rayo Hub - Rayo Server (3000)" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Rayo Hub - Subvencoes SEFAZ" dir=in action=allow protocol=TCP localport=3002
netsh advfirewall firewall add rule name="Rayo Hub - Rayo Server (80)" dir=in action=allow protocol=TCP localport=80

echo.
echo Portas 3000, 3002 e 80 liberadas no Firewall.
echo Reinicie o npm start e acesse via http://SEU-IP:3000
echo.
pause
