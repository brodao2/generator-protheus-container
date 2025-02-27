#!/bin/bash

/opt/mssql/bin/sqlservr &
sleep 15

echo "*" 
echo "* Anexando base de dados..." 
echo "*" 

sqlcmd -Q \
\"use [master] \n \
go\n \
CREATE DATABASE [Protheus_DB] ON ( FILENAME = N'/totvs/database/P1212410MNTDBEXP.mdf' ), ( FILENAME = N'/totvs/database/P1212410MNTDBEXP_log.ldf' ) FOR ATTACH\n \
GO\"

echo "*" 
echo * Base de dados anexada" >> .bashrc \
echo "*" 
