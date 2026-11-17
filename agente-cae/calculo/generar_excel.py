#!/usr/bin/env python3
"""Genera el Excel de 4 hojas (Resumen, Cálculo, Trazabilidad, Referencias) de una estimación RES060 con fórmulas vivas.

Uso: python3 generar_excel.py caso.json salida.xlsx   (necesita openpyxl)
Después se puede recalcular con LibreOffice:  soffice --headless --convert-to xlsx --outdir recalculado salida.xlsx

Método de la demanda de ACS: fórmula del catálogo (litros/día x Ce x deltaT x 365), la que usa el verificador según la guía.
Todo dato sin documento queda marcado «PENDIENTE de documentar»: no se inventa.
"""
import json
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side

AZUL, CREMA, VERDE, GRIS, OSCURO = '0000FF', 'FFF8E1', 'C6EFCE', 'F2F2F2', '1F3864'
fino = Side(style='thin', color='BFBFBF')
BORDE = Border(left=fino, right=fino, top=fino, bottom=fino)
PEND = 'PENDIENTE de documentar'


def coma(n, dec=2):
    return f'{n:.{dec}f}'.rstrip('0').rstrip('.').replace('.', ',') if isinstance(n, float) else str(n)


def titulo(ws, celda, texto, tam=14):
    ws[celda] = texto
    ws[celda].font = Font(bold=True, size=tam, color=OSCURO)


def seccion(ws, fila, texto, hasta='H'):
    ws[f'B{fila}'] = texto
    for col in range(2, ord(hasta) - 64 + 1):
        c = ws.cell(row=fila, column=col)
        c.fill = PatternFill('solid', fgColor=OSCURO)
        c.font = Font(bold=True, color='FFFFFF')


def cabecera(ws, fila, textos, col0=2):
    for i, t in enumerate(textos):
        c = ws.cell(row=fila, column=col0 + i, value=t)
        c.font, c.fill, c.border = Font(bold=True), PatternFill('solid', fgColor=GRIS), BORDE
        c.alignment = Alignment(wrap_text=True, vertical='center')


def celda(ws, ref, valor, entrada=False, resultado=False, wrap=True, fmt=None):
    c = ws[ref]
    c.value = valor
    c.border = BORDE
    c.alignment = Alignment(wrap_text=wrap, vertical='top')
    if entrada:
        c.font, c.fill = Font(color=AZUL), PatternFill('solid', fgColor=CREMA)
    if resultado:
        c.font, c.fill = Font(bold=True), PatternFill('solid', fgColor=VERDE)
    if fmt:
        c.number_format = fmt
    return c


def anchos(ws, d):
    for col, w in d.items():
        ws.column_dimensions[col].width = w


def construir(caso):
    d = caso['datos']
    acs = d.get('acs')
    origen = caso.get('origen', {})
    wb = Workbook()
    rs, ca, tr, rf = wb.active, wb.create_sheet('Cálculo'), wb.create_sheet('Trazabilidad'), wb.create_sheet('Referencias')
    rs.title = 'Resumen'

    # ---------- Cálculo: datos de entrada ----------
    titulo(ca, 'B1', 'Cálculo del ahorro energético · Ficha RES060 V1.1' + (' (calefacción y ACS)' if acs else ' (solo calefacción)'))
    ca['B2'] = 'Cada resultado es una fórmula enlazada a los datos de entrada. Azul sobre crema = dato introducido; negro = resultado calculado.'
    seccion(ca, 4, '1 · DATOS DE ENTRADA', 'I')
    cabecera(ca, 5, ['Nº', 'Dato', 'Símbolo', 'Valor', 'Unidad', 'Documento de origen', 'Ubicación en el documento'])
    ref = {}
    fila = [6]

    def entrada(clave, dato, simbolo, valor, unidad, doc=None, ubic=None, fmt=None):
        f = fila[0]
        o = origen.get(clave, {})
        celda(ca, f'B{f}', f - 5)
        celda(ca, f'C{f}', dato)
        celda(ca, f'D{f}', simbolo)
        celda(ca, f'E{f}', valor, entrada=True, fmt=fmt)
        celda(ca, f'F{f}', unidad)
        celda(ca, f'G{f}', o.get('doc', doc or PEND))
        celda(ca, f'H{f}', o.get('ubicacion', ubic or PEND))
        ref[clave] = f'$E${f}'
        fila[0] += 1

    entrada('superficieM2', 'Superficie útil habitable', 'S', d['superficieM2'], 'm²')
    entrada('dcalKwhM2', 'Demanda de energía en calefacción (situación original)', 'Dcal', d['dcalKwhM2'], 'kWh/m²·año')
    entrada('etaI', 'Rendimiento de la caldera retirada (referido a PCS)', 'ηi', d['etaI'], '—')
    if d.get('superficieCubiertaM2') is not None:
        entrada('scal', 'Superficie de calefacción cubierta por la caldera', 'S_cal', d['superficieCubiertaM2'], 'm²')
    else:
        entrada('cobertura', 'Parte de la demanda cubierta por la caldera', 'f', d.get('cobertura', 1), '—')
    entrada('zona', f"Zona climática (clima de referencia: {d.get('clima', '¿?')})", 'Zona', d['zona'], '—')
    entrada('temperatura', 'Temperatura de impulsión de la instalación', 'T', d['temperaturaImpulsion'], '°C')
    entrada('etaSh', 'Eficiencia energética estacional en calefacción (a esa temperatura y clima)', 'ηs,h', d['etaShPorcentaje'], '%')
    der = acs.get('derivado') if acs else None
    if der:
        entrada('epAcs', 'Energía primaria no renovable de ACS (situación previa)', 'EP_ACS', der['epAcsKwhM2'], 'kWh/m²·año')
        entrada('fEp', 'Factor de paso a energía primaria no renovable del combustible de la caldera', 'f_EP', der['factorEP'], 'kWhEP/kWh')
        entrada('etaCert', 'Rendimiento estacional de la caldera en el certificado', 'ηcert', der['etaCert'], '—')
    if acs and acs.get('litrosDia') is not None:
        entrada('litros', 'Demanda de ACS del certificado previo' + (' (para el control con el catálogo)' if der else ''), 'l/día', acs['litrosDia'], 'l/día')
    if acs:
        if acs['tipo'] == 'conjunto':
            entrada('etaWh', 'Eficiencia energética de calentamiento de agua del conjunto', 'ηwh', acs['etaWhPorcentaje'], '%')
        else:
            entrada('cop', 'COP a A7/W55 en condiciones UNE-EN 14511', 'COP', acs['copA7W55'], '—')
            entrada('fc', 'Factor de corrección FC de la zona (Anexo VI, caso 3)', 'FC', acs['fcZona'], '—')
    entrada('fp', 'Factor de ponderación', 'FP', 1, '—', 'D5 · Ficha RES060 V1.1', 'Apartado 3, tabla de variables')
    entrada('cc', 'Coeficiente de conversión a energía primaria de la electricidad', 'CC', 2.5, '—', 'D5 · Ficha RES060 V1.1', 'Anexo IV, nota 1')
    entrada('f1', 'Factor de corrección F(1) de la bomba aerotérmica', 'F(1)', 0.03, '—', 'D5 · Ficha RES060 V1.1', 'Anexo IV, nota 2 (F(2) = 0 en aerotermia)')
    if acs and acs.get('litrosDia') is not None:
        entrada('ce', 'Calor específico del agua (ACS)', 'Ce', 0.001162, 'kWh/l·°C', 'Fórmula del catálogo (IND040/TER040/TER100)', 'Dacs = l/día · Ce · ΔT · 365')
        entrada('dt', 'Salto de temperatura del ACS (60 − 14)', 'ΔT', 46, '°C', 'Fórmula del catálogo (IND040/TER040/TER100)', 'ΔT = 60 − 14')

    # ---------- Cálculo: pasos ----------
    f0 = fila[0] + 1
    seccion(ca, f0, '2 · CÁLCULO PASO A PASO', 'I')
    cabecera(ca, f0 + 1, ['Nº', 'Concepto', 'Símbolo', 'Resultado', 'Unidad', 'Fórmula', 'Sustitución numérica', 'Base (hoja Referencias)'])
    fila[0] = f0 + 2
    paso = {}
    n = [0]

    def sust(partes, res):
        """Texto con los números sustituidos: partes = [ref, ' × ', ref, ...]."""
        trozos = []
        for p in partes:
            trozos.append(f'ROUND({p},4)' if p.startswith('$') or p.startswith('E') else f'"{p}"')
        return '=' + '&'.join(trozos) + f'&" = "&ROUND({res},1)'

    def calc(clave, concepto, simbolo, formula, unidad, texto_formula, partes, base='', resultado=False):
        f = fila[0]
        n[0] += 1
        celda(ca, f'B{f}', n[0])
        celda(ca, f'C{f}', concepto)
        celda(ca, f'D{f}', simbolo)
        celda(ca, f'E{f}', formula, resultado=resultado, fmt='#,##0.00' if unidad != 'CAE' else '#,##0')
        celda(ca, f'F{f}', unidad)
        celda(ca, f'G{f}', texto_formula)
        celda(ca, f'H{f}', sust(partes, f'E{f}'))
        celda(ca, f'I{f}', base)
        paso[clave] = f'E{f}'
        fila[0] += 1

    S, DC, EI = ref['superficieM2'], ref['dcalKwhM2'], ref['etaI']
    if 'scal' in ref:
        calc('f', 'Parte de la calefacción que cubría la caldera', 'f', f"={ref['scal']}/{S}", '—', 'S_cal ÷ S', [ref['scal'], ' / ', S], 'N2')
        FF = paso['f']
    else:
        FF = ref['cobertura']
    calc('dcalS', 'Demanda anual de calefacción del edificio', 'Dcal·S', f'={DC}*{S}', 'kWh/año', 'Dcal × S', [DC, ' × ', S], 'N1, N2')
    if acs:
        if der:
            calc('dacs', 'Demanda anual de ACS del edificio (derivada del CEE previo)', 'Dacs', f"={ref['epAcs']}/{ref['fEp']}*{ref['etaCert']}*{S}", 'kWh/año', 'EP_ACS ÷ f_EP × ηcert × S  (consumo final de ACS × rendimiento del certificado)', [ref['epAcs'], ' / ', ref['fEp'], ' × ', ref['etaCert'], ' × ', S], 'N2 (Dacs según el CEE previo)')
        else:
            calc('dacs', 'Demanda anual de ACS del edificio (fórmula del catálogo)', 'Dacs', f"={ref['litros']}*{ref['ce']}*{ref['dt']}*365", 'kWh/año', 'l/día × Ce × ΔT × 365', [ref['litros'], ' × ', ref['ce'], ' × ', ref['dt'], ' × 365'], 'Fórmula del catálogo')
    calc('dc', 'Demanda de calefacción cubierta por la caldera', 'Dc', f"={paso['dcalS']}*{FF}", 'kWh/año', 'Dcal·S × f', [paso['dcalS'], ' × ', FF], 'N1')
    if acs:
        calc('da', 'Demanda de ACS cubierta por la caldera', 'Da', f"={paso['dacs']}*{FF}", 'kWh/año', 'Dacs × f', [paso['dacs'], ' × ', FF], 'N1')
    calc('scop', 'SCOP de calefacción según Anexo IV (todas las cifras significativas, sin recorte)', 'SCOP', f"={ref['cc']}*({ref['etaSh']}/100+{ref['f1']})", '—', 'CC × (ηs,h + F(1))', [ref['cc'], ' × (', ref['etaSh'], ' / 100 + ', ref['f1'], ')'], 'N4, N7')
    if acs:
        if acs['tipo'] == 'conjunto':
            calc('scopdhw', 'SCOP de ACS según Anexo VI, caso 1 (conjunto del mismo fabricante)', 'SCOPdhw', f"={ref['cc']}*{ref['etaWh']}/100", '—', 'CC × ηwh', [ref['cc'], ' × ', ref['etaWh'], ' / 100'], 'N6')
        else:
            calc('scopdhw', 'SCOP de ACS según Anexo VI, caso 3 (depósito no suministrado como conjunto)', 'SCOPdhw', f"={ref['cop']}*{ref['fc']}", '—', 'COP A7/W55 × FC', [ref['cop'], ' × ', ref['fc']], 'N6')
    calc('eci', 'Consumo de calefacción con la caldera retirada', 'Ec,i', f"={paso['dc']}/{EI}", 'kWh/año', 'Dc ÷ ηi', [paso['dc'], ' / ', EI], 'N1, N9')
    calc('ecf', 'Consumo de calefacción con la bomba de calor', 'Ec,f', f"={paso['dc']}/{paso['scop']}", 'kWh/año', 'Dc ÷ SCOP', [paso['dc'], ' / ', paso['scop']], 'N1')
    calc('aecal', 'Ahorro anual en calefacción', 'AEcal', f"={paso['eci']}-{paso['ecf']}", 'kWh/año', 'Ec,i − Ec,f', [paso['eci'], ' − ', paso['ecf']], 'N1')
    if acs:
        calc('eai', 'Consumo de ACS con la caldera retirada', 'Ea,i', f"={paso['da']}/{EI}", 'kWh/año', 'Da ÷ ηi', [paso['da'], ' / ', EI], 'N1, N9')
        calc('eaf', 'Consumo de ACS con la bomba de calor', 'Ea,f', f"={paso['da']}/{paso['scopdhw']}", 'kWh/año', 'Da ÷ SCOPdhw', [paso['da'], ' / ', paso['scopdhw']], 'N1')
        calc('aeacs', 'Ahorro anual en ACS', 'AEacs', f"={paso['eai']}-{paso['eaf']}", 'kWh/año', 'Ea,i − Ea,f', [paso['eai'], ' − ', paso['eaf']], 'N1')
        calc('ae', 'Ahorro anual de energía final', 'AE', f"={ref['fp']}*({paso['aecal']}+{paso['aeacs']})", 'kWh/año', 'FP × (AEcal + AEacs)', [ref['fp'], ' × (', paso['aecal'], ' + ', paso['aeacs'], ')'], 'N1')
    else:
        calc('ae', 'Ahorro anual de energía final', 'AE', f"={ref['fp']}*{paso['aecal']}", 'kWh/año', 'FP × AEcal', [ref['fp'], ' × ', paso['aecal']], 'N1')
    calc('cae', 'Certificados de ahorro energético (1 CAE = 1 kWh)', 'CAE', f"=ROUND({paso['ae']},0)", 'CAE', 'CAE = AE (redondeado)', [paso['ae']], 'N12', resultado=True)

    f = fila[0]
    ca[f'B{f}'] = ('Fórmula de la ficha: AE = FP · [ (Dcal · S) · (1/ηi − 1/SCOP)' + (' + Dacs · (1/ηi − 1/SCOPdhw)' if acs else '') + ' ] · f. '
                   'Fórmula contrastada con el texto oficial de la ficha RES060 V1.1 (MITECO, 17/11/2026).')
    ca[f'B{f}'].alignment = Alignment(wrap_text=True)
    ca.merge_cells(f'B{f}:H{f}')
    ca.row_dimensions[f].height = 32

    f += 2
    seccion(ca, f, '3 · CONTROLES')
    cabecera(ca, f + 1, ['Nº', 'Control', '', 'Valor', 'Unidad', 'Qué comprueba', 'Resultado'])
    consumo_previo = f"({paso['eci']}+{paso['eai']})" if acs else paso['eci']
    celda(ca, f'B{f + 2}', 1)
    celda(ca, f'C{f + 2}', 'Ahorro sobre el consumo previo de la caldera')
    celda(ca, f'D{f + 2}', '')
    celda(ca, f'E{f + 2}', f"={paso['ae']}/{consumo_previo}", fmt='0.0%')
    celda(ca, f'F{f + 2}', '%')
    celda(ca, f'G{f + 2}', 'El ahorro no puede superar el consumo que se evita (criterio 25-07.03)')
    celda(ca, f'H{f + 2}', f'=IF({paso["ae"]}<{consumo_previo},"Correcto: el ahorro es menor que el consumo previo","Revisar: el ahorro supera el consumo previo")')
    if der and 'litros' in ref:
        r2 = f + 3
        celda(ca, f'B{r2}', 2)
        celda(ca, f'C{r2}', 'Demanda de ACS: contraste con la fórmula del catálogo (l/día × Ce × ΔT × 365)')
        celda(ca, f'D{r2}', '')
        celda(ca, f'E{r2}', f"=({ref['litros']}*{ref['ce']}*{ref['dt']}*365-{paso['dacs']})/{paso['dacs']}", fmt='0.00%')
        celda(ca, f'F{r2}', '%')
        celda(ca, f'G{r2}', 'Diferencia entre la demanda de ACS del catálogo y la derivada del CEE (aviso si supera el 3 %)')
        celda(ca, f'H{r2}', f'=IF(ABS(E{r2})<=0.03,"Correcto: diferencia dentro del 3 %","Aviso: diferencia superior al 3 %, revisar los datos de ACS")')
    anchos(ca, {'A': 2, 'B': 6, 'C': 52, 'D': 11, 'E': 14, 'F': 14, 'G': 46, 'H': 52, 'I': 22})

    # ---------- Resumen ----------
    titulo(rs, 'B1', 'Certificados de Ahorro Energético (CAE) · Ficha RES060 V1.1', 16)
    rs['B2'] = caso.get('subtitulo', '') + (' · ' + caso['caso'] if caso.get('caso') else '')
    seccion(rs, 4, 'IDENTIFICACIÓN DE LA ACTUACIÓN', 'G')
    fr = 5
    ident = list(caso.get('identificacion', []))[:5]
    ident += [('', '')] * (5 - len(ident))  # siempre 5 filas: el resultado queda siempre en D12
    for k, v in ident:
        celda(rs, f'B{fr}', k)
        celda(rs, f'C{fr}', v)
        rs.merge_cells(f'C{fr}:G{fr}')
        fr += 1
    fr += 1
    seccion(rs, fr, 'RESULTADO', 'G')
    celda(rs, f'B{fr + 1}', 'CAE A RECLAMAR')
    celda(rs, f'D{fr + 1}', f"='Cálculo'!{paso['cae']}".replace('E', '$E$', 1), resultado=True, fmt='#,##0')
    rs[f'D{fr + 1}'].font = Font(bold=True, size=16)
    celda(rs, f'F{fr + 1}', '1 CAE = 1 kWh de ahorro anual de energía final')
    res_row = fr + 1
    fr += 3
    seccion(rs, fr, 'CÓMO SE OBTIENE', 'G')
    cabecera(rs, fr + 1, ['Concepto', 'Calefacción', 'ACS', 'Total', 'Unidad', 'Se calcula como'])
    def lin(r, concepto, c_cal, c_acs, como):
        celda(rs, f'B{r}', concepto)
        celda(rs, f'C{r}', f"='Cálculo'!{c_cal}", fmt='#,##0.0')
        celda(rs, f'D{r}', f"='Cálculo'!{c_acs}" if c_acs else 0, fmt='#,##0.0')
        celda(rs, f'E{r}', f'=C{r}+D{r}', fmt='#,##0.0')
        celda(rs, f'F{r}', 'kWh/año')
        celda(rs, f'G{r}', como)
    r = fr + 2
    lin(r, 'Demanda cubierta por la caldera', paso['dc'], paso.get('da'), 'Dcal·S y Dacs')
    lin(r + 1, f"Consumo con la caldera retirada (ηi = {coma(float(d['etaI']))})", paso['eci'], paso.get('eai'), 'Demanda ÷ rendimiento de la caldera')
    lin(r + 2, 'Consumo con la bomba de calor', paso['ecf'], paso.get('eaf'), 'Demanda ÷ SCOP y ÷ SCOPdhw')
    lin(r + 3, 'Ahorro anual de energía final', paso['aecal'], paso.get('aeacs'), 'Consumo antes − consumo después')
    fr = r + 5
    seccion(rs, fr, 'DATOS DE PARTIDA', 'G')
    cabecera(rs, fr + 1, ['Dato', 'Valor', 'Unidad', 'Documento'])
    filas = [('Superficie útil', 'superficieM2', 'm²'), ('Demanda de calefacción', 'dcalKwhM2', 'kWh/m²·año'), ('Rendimiento de la caldera', 'etaI', '—'), ('ηs,h', 'etaSh', '%')]
    if acs and acs['tipo'] == 'deposito_aparte':
        filas.append(('COP a A7/W55', 'cop', '—'))
    rr = fr + 2
    for etiqueta, clave, unidad in filas:
        celda(rs, f'B{rr}', etiqueta)
        celda(rs, f'C{rr}', f"='Cálculo'!{ref[clave]}")
        celda(rs, f'D{rr}', unidad)
        celda(rs, f'E{rr}', origen.get(clave, {}).get('doc', PEND))
        rs.merge_cells(f'E{rr}:G{rr}')
        rr += 1
    rr += 1
    rs[f'B{rr}'] = 'Leyenda: azul sobre fondo crema = dato introducido · negro = resultado calculado con fórmula · verde = resultado.'
    anchos(rs, {'A': 2, 'B': 46, 'C': 18, 'D': 16, 'E': 22, 'F': 40, 'G': 40})

    # ---------- Trazabilidad ----------
    titulo(tr, 'B1', 'Trazabilidad de los datos')
    tr['B2'] = 'Para cada dato del cálculo: valor usado, documento (códigos D1…, ver hoja Referencias), ubicación exacta y comprobación realizada.'
    seccion(tr, 4, 'A · DATOS DEL CÁLCULO Y SU DOCUMENTO DE ORIGEN', 'G')
    cabecera(tr, 5, ['Dato', 'Valor usado', 'Doc.', 'Ubicación en el documento', 'Comprobación', 'Observaciones'])
    ft = 6
    for t in caso.get('trazabilidad', []):
        for i, k in enumerate(['dato', 'valor', 'doc', 'ubicacion', 'comprobacion', 'observaciones']):
            celda(tr, f'{chr(66 + i)}{ft}', t.get(k, ''))
        ft += 1
    if not caso.get('trazabilidad'):
        celda(tr, f'B{ft}', PEND)
    anchos(tr, {'A': 2, 'B': 38, 'C': 18, 'D': 8, 'E': 46, 'F': 52, 'G': 46})

    # ---------- Referencias ----------
    titulo(rf, 'B1', 'Referencias')
    rf['B2'] = 'Documentos consultados y normativa aplicada (ficha RES060 V1.1 y anexos, y Anexo II de RES210, contrastados con los textos oficiales de MITECO leídos el 17/11/2026).'
    seccion(rf, 4, 'A · DOCUMENTOS', 'F')
    cabecera(rf, 5, ['Cód.', 'Documento', 'Emisor · fecha', 'Identificación / enlace', 'Datos que se toman'])
    fd = 6
    for dd in caso.get('documentos', []):
        for i, k in enumerate(['cod', 'doc', 'emisor', 'ident', 'datos']):
            celda(rf, f'{chr(66 + i)}{fd}', dd.get(k, ''))
        fd += 1
    fd += 1
    seccion(rf, fd, 'B · NORMATIVA Y CRITERIOS APLICADOS', 'F')
    cabecera(rf, fd + 1, ['Ref.', 'Documento', 'Ubicación', 'Qué establece', 'Dónde se aplica'])
    normas = [
        ('N1', 'Ficha RES060 V1.1', 'Apartado 3', 'AE = FP · [(Dcal · S) · (1/ηi − 1/SCOP) + Dacs · (1/ηi − 1/SCOPdhw)], ahorro anual de energía final en kWh/año.', 'Pasos de cálculo'),
        ('N2', 'Ficha RES060 V1.1', 'Apartado 3 · tabla de variables', 'FP = 1; ηi referido a PCS; Dcal, S y DACS según el certificado de eficiencia energética antes de la actuación.', 'Datos de entrada'),
        ('N3', 'Ficha RES060 V1.1', 'Anexo III', 'Se usa el SCOP del fabricante a la temperatura de impulsión; el SCOP será, al menos, el de clima medio o el de la zona equivalente (A3 a D3 cálido, E1 medio).', 'ηs,h'),
        ('N4', 'Ficha RES060 V1.1', 'Anexo IV', 'SCOP = CC · (ηs,h + F(1) + F(2)); CC = 2,5; F(1) = 3 % en aerotermia; F(2) = 0.', 'SCOP'),
        ('N5', 'Ficha RES060 V1.1', 'Anexo V', 'Hasta 70 kW, los rendimientos son los de EPREL o de la ficha técnica del fabricante.', 'ηs,h y COP'),
        ('N6', 'Ficha RES060 V1.1', 'Anexo VI', 'Conjunto del mismo fabricante (caso 1): CC·ηwh. Depósito no suministrado como conjunto (caso 3): COP A7/W55 × FC de la zona.', 'SCOPdhw'),
        ('N7', 'Criterios de verificación', 'Criterio 24/11.01', 'Utilizar todas las cifras significativas; el error de redondeo no puede superar el 1 %.', 'Todo el cálculo'),
        ('N8', 'Criterios de verificación', 'Criterio 24/11.03', 'En sustitución de caldera por bomba de calor se pueden usar los rendimientos de los anexos de RES210 y TER210.', 'ηi'),
        ('N9', 'Ficha RES210 (y TER210)', 'Anexo II · tabla B.3', 'Rendimiento estacional por defecto de la caldera según combustible, año y condensación.', 'ηi'),
        ('N10', 'Ficha RES060 V1.1', 'Anexo II', 'La sustitución total incluye la retirada física de la instalación.', 'Trazabilidad'),
        ('N11', 'Criterios de verificación', 'Criterio 25-07.03', 'Límite físico: el ahorro no puede superar el consumo que se evita.', 'Control 1'),
        ('N12', 'FAQ del Sistema CAE', 'Valor del CAE', '1 CAE equivale a 1 kWh de ahorro anual de energía final.', 'Resultado'),
    ]
    for j, nrm in enumerate(normas):
        for i, v in enumerate(nrm):
            celda(rf, f'{chr(66 + i)}{fd + 2 + j}', v)
    anchos(rf, {'A': 2, 'B': 8, 'C': 46, 'D': 28, 'E': 70, 'F': 40})
    return wb


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Uso: python3 generar_excel.py caso.json salida.xlsx')
    with open(sys.argv[1], encoding='utf-8') as fh:
        datos = json.load(fh)
    construir(datos).save(sys.argv[2])
