# Reference Brief: cumplimiento regulatorio del form de leads de ATFX LATAM (consentimiento, avisos, accesibilidad, anti-abuso)

Slug: forms-v2-compliance | Nivel: deep | Fecha: 2026-10-01 | Estado: ESCALADO
Versiones: zod=3.23.8, gsap=3.15.0, esbuild=0.23.0, typescript=5.5.4
Verificador: research-verifier 2026-10-01 ESCALATE

## 1. Pregunta y decisiones abiertas

Que debe cumplir el form de captacion de leads de un broker de CFDs y Margin FX apalancados
    10|(AT Global Markets Intl Ltd, FSC Mauricio; Brasil via LEVYCAM bajo el Parecer CVM 33/2005) que
recolecta nombre, email, telefono, pais, experiencia de trading y una aceptacion, para audiencia de
Mexico, Colombia, Ecuador, Peru, Argentina, Brasil y Chile en paginas es/en/pt, y como lo resuelve
la industria. Insumos: el pedido del team-lead, el codigo de atfx-forms, el brief previo
`embed-form-submit-privacy` (que ya cubre checkbox premarcado, geo-IP a terceros y que registrar),
y las decisiones pendientes D-05, D-06, D-17 y D-20 del programa atfx-leadkit. No hay discovery.

Este brief NO es asesoria legal. Recopila requisitos con fuente y separa en cada bloque lo que
decide Legal de ATFX / Karen (base legal, textos, alcance territorial) de lo que es tecnico
(como se renderiza, se registra y se prueba). Se extiende el brief previo; no se repite su D3.
    20|
Bloque C1 - Consentimiento. Separar aceptacion de aviso de privacidad / terminos del opt-in de
marketing (email, WhatsApp, llamadas); no premarcado; granularidad por finalidad y canal; prueba
del consentimiento (que, cuando, version del texto, IP/UA) con la restriccion de que los campos a
Salesforce no cambian. LEGAL: base legal por finalidad y pais, texto del aviso. TECNICO: control,
estado inicial, versionado del texto, que viaja en el POST.

Bloque C2 - Avisos regulatorios junto al form. Advertencia de riesgo de CFDs, aviso CVM para
Brasil, entidad y licencia, enlaces a privacidad y terminos por idioma. LEGAL: el texto exacto,
si lleva porcentaje, que paises se sirven. TECNICO: donde y como se muestran, por idioma.
    30|
Bloque C3 - Accesibilidad como cumplimiento. WCAG 2.2 AA aplicado al form (labels, errores, foco,
contraste) y si alguna jurisdiccion LATAM lo exige a un privado. LEGAL: si la ley brasileña aplica
a ATFX. TECNICO: todo lo demas.

Bloque C4 - Anti-abuso y proteccion de datos en transito y almacenamiento. Honeypot vs Turnstile,
minimizacion, retencion. TECNICO en el widget; servidor (WordPress, middleware) es de IT; plazos de
retencion son de Legal.

## 2. Estado actual
    40|
Contextos: navegador en landings de www.atfxlatam.com (widget HTML de Elementor, paginas es/en/pt), preview.html con el dev server de esbuild (otro origen, sin envio real), runner `node --test` sobre test/ (Node 22.18 o mayor), CI release.yml (Node 20, typecheck + build, sin tests), backend admin-ajax de Elementor Pro + middleware en lotes + Salesforce (fuera del repo), politicas legales en PDF servidas desde atfx.com (fuera del repo)

- C1: el unico campo de aceptacion es `field_8f8f3d5` y nace marcado (`defaultChecked: true`); no existe un segundo campo para marketing [repo:src/forms/lead.ts:23]
- C1: el texto es mezcla en una sola frase el uso de contacto "sobre sus productos y servicios" (marketing), la baja y la referencia a la politica de privacidad [repo:src/i18n/index.ts:49]
- C1: el texto en ingles repite la misma mezcla de finalidades [repo:src/i18n/index.ts:91]
- C1: el texto en portugues repite la misma mezcla de finalidades [repo:src/i18n/index.ts:133]
- C1: el mensaje de validacion dice "Debes aceptar los terminos", pero la etiqueta no menciona terminos [repo:src/i18n/index.ts:65]
- C1: la etiqueta se escribe con `textContent`, asi que "Politica de Privacidad" es texto plano, sin enlace [repo:src/ui/atoms/acceptance.ts:32]
- C1: el diccionario solo tiene una clave legal, `acceptance`; no hay claves para advertencia de riesgo, entidad ni enlaces [repo:src/i18n/index.ts:16]
    50|- C1: Elementor/WP exige el checkbox: vacio rechaza antes de Salesforce [repo:CLAUDE.md:124]
- C1/C4: el pipeline pasa por una base intermedia / Zapier en lotes antes de Salesforce, asi que el lead existe en mas de un sistema [repo:CLAUDE.md:105]
- C2: el pie de la landing en vivo identifica a "AT Global Markets Intl Ltd, regulada por FSC de Mauricio (C118023331)" y excluye Canada, Japon, Corea del Norte, Iran y EE.UU. [doc:https://www.atfxlatam.com/es/training-sessions-25jun/@2026-10-01]
- C2: la advertencia de riesgo de la landing esta solo en el pie, sin porcentaje: "El trading de Forex y CFDs es muy especulativo... Puede perder parte o la totalidad de su capital" [doc:https://www.atfxlatam.com/es/training-sessions-25jun/@2026-10-01]
- C2: junto al form de la landing no hay advertencia de riesgo ni aviso de consentimiento propio [doc:https://www.atfxlatam.com/es/training-sessions-25jun/@2026-10-01]
- C2: el enlace "Privacidad" de la pagina es apunta a un PDF en ingles de la entidad MU [doc:https://www.atfxlatam.com/es/training-sessions-25jun/@2026-10-01]
- C2: el pie de atfx.com publica en ingles el contrato con Levycam CCTVM (CNPJ 50.579.044/0001-96) "as provided for in CVM Guidance Opinion No. 33/2005" [doc:https://www.atfx.com/en/about-us/company-news@2026-10-01]
- C2: entidad AT Global Markets Intl Ltd, Company Number 157819, FSC Mauricio Investment Dealer, licencias C113012295 y C118023331; Brasil via LEVYCAM bajo el Parecer CVM 33/2005 [KAREN:firmas de correo compartidas en la sesion 2026-10-01]
- C2: la politica de privacidad MU (abril 2024, solo en ingles) dice que rige la informacion "from its previous and current customers" [doc:https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf@2024-04-22]
- C2: esa politica trata el marketing como opt-out: el cliente puede pedir por email al DPO que no se usen sus datos para marketing (punto 2.5) [doc:https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf@2024-04-22]
    60|- C2: esa politica cobra USD 10 por entregar copia de los datos (punto 5.2) [doc:https://www.atfx.com/wp-content/uploads/2024/04/AT-Global-Markets-MU_EN_Privacy-and-Internal-Privacy-Controls-Policy.pdf@2024-04-22]
- C2: la lista de paises del form incluye Brasil [repo:src/data/options.ts:139]
- C3: el form desactiva la validacion nativa con `novalidate` [repo:src/core/form-engine.ts:10]
- C3: el atomo de input crea el control sin atributo `autocomplete` [repo:src/ui/atoms/input.ts:25]
- C3: el estado de error se marca solo con la clase `has-error`; no se pone `aria-invalid` ni `aria-describedby` [repo:src/core/errors.ts:48]
- C3: cada slot de error de campo tiene `role="alert"` [repo:src/ui/atoms/error-message.ts:6]
- C3: un submit invalido pinta errores y retorna sin mover el foco [repo:src/core/form-engine.ts:101]
- C3: tras exito el thank-you reemplaza el form, y con el desaparece el elemento que tenia el foco [repo:src/core/form-engine.ts:134]
- C3: el thank-you se crea con `role="status"` y con su contenido ya adentro [repo:src/ui/organisms/thank-you.ts:13]
- C3: el buscador del combobox tiene el placeholder fijo "Buscar..." en español y no tiene label [repo:src/ui/atoms/select.ts:81]
    70|- C3: el disparador del combobox es un boton con `aria-haspopup="listbox"` [repo:src/ui/atoms/select.ts:73]
- C3: el color de error del tema claro es `#f04438` [repo:src/styles/forms.css:20]
- C3: el texto de error mide 0.78em [repo:src/styles/forms.css:387]
- C3: el borde de foco es `#22d3ee` [repo:src/styles/forms.css:15]
- C3: el borde de los controles en reposo es `#d0d5dd` [repo:src/styles/forms.css:14]
- C3: el asterisco de requerido es `aria-hidden` [repo:src/ui/atoms/label.ts:10]
- C3: el input lleva `required` nativo cuando el campo es obligatorio [repo:src/ui/atoms/input.ts:30]
- C4: admin-ajax solo restringe por CORS a navegadores de otro origen; curl y forms nativos no aplican CORS [repo:CLAUDE.md:122]
- C4: el valor de `data-zoom-link` ya entra sin validar a un hidden que va a Salesforce [repo:src/index.ts:58]
- Restriccion: los campos y schemas del form no se modifican; solo el texto puede cambiar, y cambiar texto es un release del paquete compartido [KAREN:memory/feedback_atfx_forms_campos_fijos.md]
    80|- Restriccion: instalar, quitar o subir dependencias esta bloqueado sin aprobacion [KAREN:~/.claude/CLAUDE.md]

## 3. Fuentes primarias

- C1 (UE, referencia): EDPB 05/2020 parr. 42-44: con varias finalidades, la persona debe poder elegir cada una; mezclar finalidades sin consentimiento separado quita libertad [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 45 (ejemplo 7): pedir en un solo consentimiento marketing por email y ceder datos al grupo no es granular y no es valido [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 26 y 33: atar el servicio a un consentimiento para un tratamiento que no es necesario (p. ej. marketing) presume que no es libre [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 31: si el tratamiento es necesario para el contrato o servicio pedido, la base correcta no es el consentimiento [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 106: la prueba del consentimiento no debe llevar a recolectar mas datos de los necesarios [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 107: la prueba se guarda mientras dure el tratamiento y despues solo lo necesario para obligaciones legales o reclamos [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
    90|- C1 (UE): EDPB parr. 108: guardar datos de la sesion, la documentacion del flujo vigente en ese momento y copia de la informacion mostrada; no basta referir la configuracion del sitio [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 114 y 116: retirar el consentimiento debe ser tan facil como darlo y se informa antes de darlo [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (UE): EDPB parr. 121-123: la base legal se decide antes de recolectar y no se puede cambiar de consentimiento a interes legitimo despues [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]
- C1 (Brasil): la ANPD (guia v1.0) dice que bajo la LGPD el consentimiento es libre, informado e inequivoco, y que no es compatible obtenerlo "forzado", condicionado a aceptar todo [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- C1 (Brasil): ANPD, sobre el art. 6 I-III: no se admite indicar finalidades genericas, como la aceptacion de terminos y condiciones generales sin finalidades especificas [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- C1 (Brasil): ANPD, sobre el art. 9: al titular se informa la forma del tratamiento, el periodo de retencion, las finalidades especificas, la comparticion con terceros y sus derechos [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- C1 (Brasil): ANPD, citando el art. 8 par. 5: el consentimiento se revoca por "procedimento gratuito e facilitado", similar al usado para obtenerlo [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- C1 (Brasil): ANPD: compete al controlador comprobar que el consentimiento se obtuvo respetando todos los requisitos [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- C1 (Mexico): LFPDPPP 2025 art. 7: por regla general vale el consentimiento tacito tras poner a disposicion el aviso, salvo que la ley pida expreso; datos financieros o patrimoniales requieren expreso [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- C1 (Mexico): LFPDPPP art. 15: el aviso contiene identidad y domicilio, datos tratados, finalidades distinguiendo las que requieren consentimiento, opciones para limitar uso, mecanismos ARCO y como se avisan cambios [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
   100|- C1 (Mexico): LFPDPPP art. 16 II: si los datos se obtienen por medio electronico se da un aviso simplificado con las fracciones I a IV del art. 15 y el sitio del aviso integral [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- C1 (Mexico): LFPDPPP art. 11: usar los datos para una finalidad distinta a las del aviso requiere nuevo consentimiento [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- C1 (Colombia): Decreto 1377/2013 art. 5: la autorizacion se pide a mas tardar al recolectar e informa los datos y "todas las finalidades especificas" [doc:https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/decretos/DECRETO_1377_2013.pdf@1377-2013]
- C1 (Colombia): Decreto 1377 art. 7: la autorizacion es escrita, oral o por conducta inequivoca, y "En ningun caso el silencio podra asimilarse a una conducta inequivoca" [doc:https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/decretos/DECRETO_1377_2013.pdf@1377-2013]
- C1 (Colombia): Decreto 1377 art. 8: los responsables deben conservar prueba de la autorizacion [doc:https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/decretos/DECRETO_1377_2013.pdf@1377-2013]
- C1 (Peru): Reglamento DS 016-2024-JUS art. VI.3.1: aplica a responsables fuera de Peru que ofrecen bienes o servicios a titulares en Peru [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. VII: ese responsable designa un representante en o para el territorio peruano [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. 2: el consentimiento valido es libre, previo, expreso e inequivoco, e informado [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. 3.2: condicionar un servicio a datos no indispensables para prestarlo afecta la libertad del consentimiento [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. 5.1.3: por canal digital es expreso el "hacer clic" o "dar un toque" [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
   110|- C1 (Peru): Reglamento art. 6.1: al recolectar se informa identidad y domicilio, finalidades, destinatarios, banco de datos, obligatoriedad, transferencias, perfiles, plazo de conservacion y como ejercer derechos [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. 7: publicar la politica de privacidad cumple el deber de informar pero no reemplaza el consentimiento [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. 9: la carga de la prueba del consentimiento es siempre del responsable [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Peru): Reglamento art. 10.2: el titular puede negar el consentimiento para finalidades adicionales sin afectar la relacion principal [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- C1 (Argentina): Ley 25.326 art. 5: el tratamiento requiere consentimiento libre, expreso e informado, por escrito o medio equiparable, y destacado si va con otras declaraciones [doc:https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm@25326]
- C1 (Argentina): Ley 25.326 art. 6: al recolectar se informa finalidad y destinatarios, existencia del archivo y responsable, obligatoriedad, consecuencias y derechos [doc:https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm@25326]
- C1 (Argentina): Ley 25.326 art. 27: en publicidad el titular puede pedir en cualquier momento el retiro o bloqueo de sus datos, sin cargo [doc:https://servicios.infoleg.gob.ar/infolegInternet/anexos/60000-64999/64790/texact.htm@25326]
- C1 (Ecuador): LOPDP art. 3.3: aplica a responsables no establecidos en Ecuador cuando ofrecen bienes o servicios a titulares que residen alli [doc:https://www.gob.ec/sites/default/files/regulations/2022-08/Ley-Org%C3%A1nica-Protecci%C3%B3n-Datos-Personales.pdf@RO-459-2021]
- C1 (Ecuador): LOPDP art. 8: consentimiento libre, especifico, informado e inequivoco; revocable por un procedimiento similar al de su obtencion [doc:https://www.gob.ec/sites/default/files/regulations/2022-08/Ley-Org%C3%A1nica-Protecci%C3%B3n-Datos-Personales.pdf@RO-459-2021]
- C1 (Ecuador): LOPDP art. 8, ultimo parrafo: con pluralidad de finalidades debe constar que el consentimiento se otorga para todas ellas [doc:https://www.gob.ec/sites/default/files/regulations/2022-08/Ley-Org%C3%A1nica-Protecci%C3%B3n-Datos-Personales.pdf@RO-459-2021]
   120|- C1 (Ecuador): LOPDP art. 7.5: tambien es base legitima la ejecucion de medidas precontractuales a peticion del titular [doc:https://www.gob.ec/sites/default/files/regulations/2022-08/Ley-Org%C3%A1nica-Protecci%C3%B3n-Datos-Personales.pdf@RO-459-2021]
- C1 (Chile): Ley 21.719, nuevo art. 12 de la Ley 19.628: consentimiento libre, informado, especifico por finalidad, previo e inequivoco, por declaracion o "acto afirmativo" [doc:https://www.diariooficial.interior.gob.cl/publicaciones/2024/12/13/44023/01/2583630.pdf@21719]
- C1 (Chile): Ley 21.719 art. 12: se presume no libre el consentimiento recabado en un contrato o servicio en que esa recoleccion no es necesaria [doc:https://www.diariooficial.interior.gob.cl/publicaciones/2024/12/13/44023/01/2583630.pdf@21719]
- C1 (Chile): Ley 21.719, transitorio primero: las modificaciones rigen "el dia primero del mes vigesimo cuarto posterior a la publicacion" (publicada el 13 de diciembre de 2024) [doc:https://www.diariooficial.interior.gob.cl/publicaciones/2024/12/13/44023/01/2583630.pdf@21719]
- C1 (WhatsApp): el opt-in debe decir claramente que la persona acepta recibir comunicaciones del negocio y nombrar al negocio; puede recogerse en un sitio web [doc:https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/@2026-10-01]
- C2 (Brasil): Parecer CVM 33/2005: un intermediario extranjero que prospecta inversores en Brasil debe registrarse en la CVM o contratar una institucion del sistema de distribucion brasileño [doc:https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/pareceres-orientacao/anexos/pare033.pdf@2005-09-30]
- C2 (Brasil): Parecer 33: la autorizacion de un regulador extranjero "nao assegura o direito de intermediar" en el mercado brasileño [doc:https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/pareceres-orientacao/anexos/pare033.pdf@2005-09-30]
- C2 (Brasil): Parecer 33 item c: incluir a Brasil entre los paises de un formulario es indicio de que la pagina se dirige a residentes en Brasil [doc:https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/pareceres-orientacao/anexos/pare033.pdf@2005-09-30]
- C2 (Brasil): Parecer 33: el uso del portugues tambien puede considerarse para evaluar si la oferta se dirige a Brasil [doc:https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/pareceres-orientacao/anexos/pare033.pdf@2005-09-30]
- C2 (Mauricio): las guias de publicidad de la FSC aplican a "Promoters of financial products offered in Mauritius" (1.3) [doc:https://www.fscmauritius.org/media/1158/guidelines-for-advertising-and-marketing-of-financial-products-as-amended-01-april-2016.pdf@2016-04-01]
   130|- C2 (Mauricio): FSC: la advertencia va en letra al menos del mismo tamaño que el resto del texto, o mas chica solo si esta destacada [doc:https://www.fscmauritius.org/media/1158/guidelines-for-advertising-and-marketing-of-financial-products-as-amended-01-april-2016.pdf@2016-04-01]
- C2 (Mauricio): FSC: el anuncio declara nombre completo y datos de licencia del promotor [doc:https://www.fscmauritius.org/media/1158/guidelines-for-advertising-and-marketing-of-financial-products-as-amended-01-april-2016.pdf@2016-04-01]
- C2 (Mauricio): FSC: los beneficios no reciben mas protagonismo que los riesgos, y un producto en moneda extranjera advierte el riesgo cambiario [doc:https://www.fscmauritius.org/media/1158/guidelines-for-advertising-and-marketing-of-financial-products-as-amended-01-april-2016.pdf@2016-04-01]
- C2 (Reino Unido, plantilla de la industria): FCA COBS 22.5.6R fija el texto "CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage" con el porcentaje propio del proveedor [doc:https://handbook.fca.org.uk/handbook/cobs22/cobs22s5@2026-10-01]
- C2 (Reino Unido): COBS 22.5.8R pide la advertencia destacada, en su propio recuadro y fija arriba en pantalla al hacer scroll [doc:https://handbook.fca.org.uk/handbook/cobs22/cobs22s5@2026-10-01]
- C3: WCAG 2.2 (Recomendacion, actualizada 2024-12-12) 3.3.1 (A): un error detectado identifica el campo y se describe en texto [doc:https://www.w3.org/TR/WCAG22/@2.2]
- C3: WCAG 2.2 3.3.2 (A): hay labels o instrucciones cuando se pide entrada [doc:https://www.w3.org/TR/WCAG22/@2.2]
- C3: WCAG 2.2 1.3.5 (AA): el proposito de cada campo de datos del usuario es determinable por programa [doc:https://www.w3.org/TR/WCAG22/@2.2]
- C3: Understanding 1.3.5: la tecnica es el atributo `autocomplete` con valores como given-name, family-name, email y tel [doc:https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html@2.2]
- C3: WCAG 2.2 1.4.3 (AA): texto con contraste de al menos 4.5:1 (3:1 para texto grande) [doc:https://www.w3.org/TR/WCAG22/@2.2]
   140|- C3: WCAG 2.2 1.4.11 (AA): componentes de interfaz con contraste de al menos 3:1 contra lo adyacente [doc:https://www.w3.org/TR/WCAG22/@2.2]
- C3: Understanding 1.4.11: aplica al indicador de foco y al borde que identifica un input o un checkbox [doc:https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html@2.2]
- C3: WCAG 2.2 2.4.11 (AA): el componente con foco no queda totalmente oculto por contenido del autor [doc:https://www.w3.org/TR/WCAG22/@2.2]
- C3: WCAG 2.2 4.1.2 (A) nombre, rol y valor determinables por programa; 4.1.3 (AA) mensajes de estado determinables por rol o propiedades [doc:https://www.w3.org/TR/WCAG22/@2.2]
- C3 (regional): la lista de politicas del W3C registra Brasil (Lei Brasileira de Inclusao 2015, obligatoria), Argentina (26.653, WCAG 2.0) y Colombia (lineamientos web 2020, WCAG 2.1); no lista Mexico, Peru ni Chile [doc:https://www.w3.org/WAI/policies/@2026-10-01]
- C3 (Argentina): Ley 26.653 obliga al Estado y a privados solo como concesionarios de servicios publicos, prestadores o contratistas del Estado [doc:https://servicios.infoleg.gob.ar/infolegInternet/anexos/175000-179999/175694/norma.htm@26653]
- C4: Turnstile exige llamar a Siteverify en el servidor; "The client-side widget alone does not protect your forms" [doc:https://developers.cloudflare.com/turnstile/get-started/server-side-validation/@2026-10-01]
- C4: el token de Turnstile vale 300 segundos, es de un solo uso y viaja en el campo `cf-turnstile-response` [doc:https://developers.cloudflare.com/turnstile/get-started/server-side-validation/@2026-10-01]
- C4 (Mexico): LFPDPPP art. 10: los datos que dejan de ser necesarios para las finalidades del aviso se suprimen previo bloqueo [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- C4 (Mexico): LFPDPPP art. 12: el tratamiento es el necesario, adecuado y relevante para las finalidades del aviso [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
   150|- C4 (Brasil): ANPD, sobre el principio de necesidad (art. 6 III): solo datos pertinentes, proporcionales y no excesivos, y no tratar si la finalidad se logra por medios menos gravosos [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- C4 (Ecuador): LOPDP art. 10 e) minimizacion, i) conservacion no mayor a la necesaria con plazos de supresion, j) seguridad [doc:https://www.gob.ec/sites/default/files/regulations/2022-08/Ley-Org%C3%A1nica-Protecci%C3%B3n-Datos-Personales.pdf@RO-459-2021]
- C4 (Colombia): Decreto 1377 art. 4: la recoleccion se limita a datos pertinentes y adecuados para la finalidad [doc:https://www.unidadvictimas.gov.co/wp-content/uploads/Documentos/decretos/DECRETO_1377_2013.pdf@1377-2013]

## 4. Implementaciones de referencia

- Contact Form 7 (rocklobster-in, plugin de formularios de WordPress mantenido por su autor desde 2007, push 2026-09-27): el checkbox de aceptacion solo nace marcado con la opcion explicita `default:on` [ref:https://github.com/rocklobster-in/contact-form-7/blob/488ad8d9c625de814de54fd9ba82609eaad84a15/modules/acceptance.php#L54@488ad8d]
- Contact Form 7: una aceptacion marcada `optional` no bloquea el envio, lo que separa un opt-in de marketing de la aceptacion obligatoria [ref:https://github.com/rocklobster-in/contact-form-7/blob/488ad8d9c625de814de54fd9ba82609eaad84a15/modules/acceptance.php#L171@488ad8d]
- Contact Form 7: al aceptar guarda en el envio el texto exacto de la condicion con `add_consent(nombre, contenido)` [ref:https://github.com/rocklobster-in/contact-form-7/blob/488ad8d9c625de814de54fd9ba82609eaad84a15/modules/acceptance.php#L168@488ad8d]
- Contact Form 7: el correo de notificacion escribe "Consented" o "Not consented" seguido del texto de la condicion [ref:https://github.com/rocklobster-in/contact-form-7/blob/488ad8d9c625de814de54fd9ba82609eaad84a15/modules/acceptance.php#L218@488ad8d]
   160|- GOV.UK Frontend (alphagov, sistema de diseño del gobierno britanico, push 2026-10-01): el resumen de errores toma el foco al iniciarse para que se anuncie [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/error-summary/error-summary.mjs#L24@283cc58]
- GOV.UK Frontend: el mensaje de error antepone un "Error:" visualmente oculto al texto [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/error-message/template.njk#L9@283cc58]
- GOV.UK Frontend: el input enlaza su mensaje de error con `aria-describedby` y expone `autocomplete` [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/input/template.njk#L48@283cc58]
- spatie/laravel-honeypot (Spatie, 1.6k estrellas, push 2026-09-11): el campo trampa va en un contenedor oculto con `aria-hidden`, `tabindex="-1"` y autocompletado apagado, y la verificacion corre en el servidor [ref:https://github.com/spatie/laravel-honeypot/blob/407d5ba3c0b789b10a3af3afdab250bb01f16326/resources/views/honeypotFormFields.blade.php#L5@407d5ba]
- spatie/laravel-honeypot: ademas rechaza envios mas rapidos que un minimo de segundos desde que se pinto el form [ref:https://github.com/spatie/laravel-honeypot/blob/407d5ba3c0b789b10a3af3afdab250bb01f16326/config/honeypot.php#L42@407d5ba]
- invisible_captcha (markets, 1.2k estrellas, push 2026-07-15): ante spam responde 200 sin contenido para que el bot crea que envio [ref:https://github.com/markets/invisible_captcha/blob/468719871737212fd197be6a33b6d8cdd44744cb/README.md#L53@4687198]
- invisible_captcha: umbral de tiempo de 4 s por defecto y advierte que Chrome puede ignorar `autocomplete="off"` en nombres que se autocompletan [ref:https://github.com/markets/invisible_captcha/blob/468719871737212fd197be6a33b6d8cdd44744cb/README.md#L114@4687198]
- Pepperstone (entidad de Bahamas, SCB SIA-F217) publica la advertencia con porcentaje: "79.6% of retail investor accounts lose money when trading CFDs with this provider" [doc:https://www.pepperstone.com/en/@2026-10-01]
- IC Markets global (Raw Trading Ltd, FSA Seychelles SD018) usa una advertencia sin porcentaje y lista paises excluidos [doc:https://ic.com/global/es/@2026-10-01]

   170|## 5. Opciones

C1 - Consentimiento (base legal y texto: LEGAL; control y registro: TECNICO)

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| A. Un checkbox obligatorio que agrupa privacidad, terminos y marketing (hoy, premarcado) | Cero cambio de campos | Granularidad fallida (EDPB 42-45, ANPD, LOPDP 8, Ley 21.719 art. 12); premarcado invalido; marketing condicionado | baja | No |
| B. Checkbox obligatorio desmarcado de aviso de privacidad + checkbox opcional desmarcado de marketing (uno o por canal) | Patron de CF7 y HubSpot; separa finalidades; marketing no condiciona | Agrega un campo al POST y a Salesforce: choca con "campos intocables" | media | Objetivo, si Karen aprueba el campo nuevo |
| C. Un checkbox obligatorio desmarcado, con texto limitado a lo pedido (contacto sobre la solicitud) + aviso de privacidad enlazado; marketing se pide despues por otro canal | Respeta los campos fijos; consentimiento no agrupado | El opt-in de marketing queda fuera del form y hay que operarlo aparte | baja | Si, dentro de las restricciones actuales, sujeto a Legal |
| D. Sin checkbox de consentimiento: aviso informativo y base precontractual / tacito LFPDPPP | Menos friccion | Elementor exige el checkbox; no sirve para marketing en Brasil/Peru/Chile | media | Decision de Legal; hoy no es posible sin tocar el form #593 |
   180|
C1 - Prueba del consentimiento sin campos nuevos (TECNICO)

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| R1. Versionar el texto de consentimiento por idioma en el repo, con fecha y tag de release; SF ya guarda `on`, referrer, idioma y CreatedDate | Cubre "copia de la informacion mostrada" (EDPB 108) sin campo nuevo | Reconstruir que version vio un lead depende de la fecha y del cache de jsDelivr | baja | Si |
| R2. Mandar la version del texto dentro de un campo existente de texto libre | Prueba por lead | Cambia el contenido de un campo que el connector ya mapea; gris frente a "campos intocables" | baja | Solo si Karen lo autoriza |
| R3. Campo nuevo `consent_text_version` (y opcionalmente marketing) | Prueba exacta por lead | Viola la restriccion de campos | media | No sin aprobacion |
| R4. Guardar IP y user-agent | Mas contexto de sesion | Ningun texto primario leido lo exige; EDPB 106 pide no recolectar de mas | media | No por defecto |

   190|C2 - Avisos junto al form (texto: LEGAL; render: TECNICO)

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| V1. Bloque legal bajo el boton: advertencia de riesgo, entidad y licencia, enlaces a privacidad y terminos; en pt ademas el aviso CVM/Levycam | Coincide con FSC 2.1 y con el patron de la industria; los textos son texto, no campos | Mas texto en el form; cada cambio es un release del paquete | baja | Si, con textos firmados por Legal |
| V2. Solo el pie de la landing | Cero cambio en el widget | El form puede quedar lejos del pie; el aviso de privacidad no se enlaza en el punto de recoleccion | baja | No |
| V3. Advertencia con porcentaje estilo COBS | Es la formula mas reconocida | El porcentaje es propio de cada proveedor y se calcula; inventarlo seria engañoso | media | Solo si Legal entrega la cifra |

C3 - Accesibilidad (TECNICO)

   200|| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| W1. WCAG 2.2 AA completo en el widget (autocomplete, aria-invalid/describedby, foco al primer error o resumen, contraste, foco del thank-you) | Cubre Brasil si aplica; mejora el uso movil | Ajustes de tokens de color con diseño | media | Si |
| W2. Solo lo que exija una ley LATAM aplicable | Menos trabajo | Ninguna ley leida fija un nivel WCAG para este privado; deja barreras reales | baja | No |

C4 - Anti-abuso (TECNICO; servidor: IT)

| Opcion | Pros | Contras | Complejidad | Recomendacion |
|---|---|---|---|---|
| H1. Honeypot + tiempo minimo en el cliente, sin fetch si se activa | Sin dependencia ni campo nuevo; filtra bots que ejecutan el widget | No frena a quien postea directo a admin-ajax | baja | Si, como filtro barato |
   210|| H2. Turnstile | Desafio real y gestionado | Exige siteverify en WordPress y un campo `cf-turnstile-response` en el POST; tercero nuevo (privacidad) | alta | Escalar a IT y Legal |
| H3. Rate limit / reglas WAF de Cloudflare sobre admin-ajax | Protege el endpoint real | Fuera del repo | media | Escalar a IT |

## 6. Evidencia en contra

- Contra C1-B: agrega un campo y rompe la regla de campos fijos; se resuelve recomendando C1-C dentro de la restriccion y dejando B como decision de Karen [KAREN:memory/feedback_atfx_forms_campos_fijos.md]
- Contra desmarcar: en Mexico el consentimiento tacito es la regla general, asi que un checkbox podria sobrar; se acepta como decision de Legal porque Colombia niega valor al silencio y Peru y Chile piden acto afirmativo [doc:https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf@DOF-2025-11-14]
- Contra usar la guia EDPB: el GDPR puede no aplicar a trafico LATAM; se resuelve porque Peru, Ecuador, Chile y Colombia llegan por texto propio a lo mismo (finalidad especifica, inequivoco, prueba del responsable) [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
- Contra usar la guia de cookies de la ANPD para un form: trata de cookies, no de leads; se acepta porque los pasajes citados explican principios generales de la LGPD (art. 6, 8 y 9), no reglas propias de cookies [doc:https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/@@download/file@1.0]
- Contra citar Chile: la Ley 21.719 aun no rige; se acepta porque su transitorio la pone en vigor en diciembre de 2026, dentro de la vida util de este form [doc:https://www.diariooficial.interior.gob.cl/publicaciones/2024/12/13/44023/01/2583630.pdf@21719]
   220|- Contra C2-V1: las guias de la FSC aplican a productos ofrecidos en Mauricio, no necesariamente a anuncios en LATAM; se acepta porque el texto ya existe en el pie de ATFX y llevarlo al form no tiene costo de campos [doc:https://www.fscmauritius.org/media/1158/guidelines-for-advertising-and-marketing-of-financial-products-as-amended-01-april-2016.pdf@2016-04-01]
- Contra el aviso CVM en el form: podria leerse como admision de que la pagina se dirige a Brasil; se resuelve en sentido contrario, porque ofrecer Brasil y portugues ya es indicio de eso segun el propio Parecer y la ruta valida es la institucion local [doc:https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/pareceres-orientacao/anexos/pare033.pdf@2005-09-30]
- Contra C4-H1: un honeypot solo en cliente no frena POST directos al endpoint publico; se acepta como filtro barato y la defensa real se escala a IT [repo:CLAUDE.md:122]
- Contra C4-H1: las referencias verifican el honeypot en el servidor, no en el cliente; se acepta la diferencia de forma explicita porque el widget no puede agregar campos [ref:https://github.com/spatie/laravel-honeypot/blob/407d5ba3c0b789b10a3af3afdab250bb01f16326/resources/views/honeypotFormFields.blade.php#L5@407d5ba]
- Contra R1: sin la version en el lead, la prueba es una reconstruccion por fecha; se acepta porque EDPB 108 pide documentacion del flujo y copia de lo mostrado, no un campo por registro [doc:https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf@1.1]

## 7. Ejemplares y anti-ejemplos

- Asi se ve bien hecho (C1): el checkbox solo nace marcado si se pide de forma explicita [ref:https://github.com/rocklobster-in/contact-form-7/blob/488ad8d9c625de814de54fd9ba82609eaad84a15/modules/acceptance.php#L54@488ad8d]

   230|```php
'checked' => $tag->has_option( 'default:on' ),
```

- Asi se ve bien hecho (C1): al aceptar se guarda el texto exacto mostrado, y una aceptacion opcional no bloquea [ref:https://github.com/rocklobster-in/contact-form-7/blob/488ad8d9c625de814de54fd9ba82609eaad84a15/modules/acceptance.php#L168@488ad8d]

```php
if ( $value and $content ) {
	$submission->add_consent( $tag->name, $content );
}
   240|
if ( $tag->has_option( 'optional' ) ) {
	continue;
}
```

- Asi se ve bien hecho (C3): el error se anuncia con un prefijo oculto y queda enlazado al campo [ref:https://github.com/alphagov/govuk-frontend/blob/283cc58ead97f3e3379199976709713914e00b05/packages/govuk-frontend/src/govuk/components/error-message/template.njk#L9@283cc58]

```njk
<span class="govuk-visually-hidden">{{ visuallyHiddenText }}:</span> {{ errorMessageText }}
   250|```

- Asi se ve bien hecho (C4): el campo trampa fuera del arbol accesible y del orden de tabulacion [ref:https://github.com/spatie/laravel-honeypot/blob/407d5ba3c0b789b10a3af3afdab250bb01f16326/resources/views/honeypotFormFields.blade.php#L5@407d5ba]

```html
<div id="{{ $nameFieldName }}_wrap" style="display: none" aria-hidden="true">
    <input id="{{ $nameFieldName }}" name="{{ $nameFieldName }}" type="text" value="" autocomplete="nope" tabindex="-1">
```

- Anti-ejemplo (C1): consentimiento premarcado que mezcla contacto comercial y privacidad en un solo control [repo:src/forms/lead.ts:23]
   260|- Anti-ejemplo (C1): "Consulta nuestra Politica de Privacidad" sin enlace en el punto de recoleccion [repo:src/ui/atoms/acceptance.ts:32]
- Anti-ejemplo (C2): enlace de privacidad de la pagina es a un PDF solo en ingles [doc:https://www.atfxlatam.com/es/training-sessions-25jun/@2026-10-01]
- Anti-ejemplo (C3): error marcado solo por clase y color, sin `aria-invalid` ni enlace al mensaje [repo:src/core/errors.ts:48]
- Anti-ejemplo (C3): submit invalido que no mueve el foco a ningun lado [repo:src/core/form-engine.ts:101]

## 8. Trampas

- Desmarcar el checkbox lo vuelve una accion obligatoria, porque Elementor rechaza el envio sin el; la tasa de envio puede bajar y hay que medirla [repo:CLAUDE.md:124]
- Un segundo checkbox de marketing viaja como campo nuevo a admin-ajax y al connector: es cambio de contrato, no de texto [KAREN:memory/feedback_atfx_forms_campos_fijos.md]
- Si el unico checkbox sigue obligatorio y su texto incluye marketing, el marketing queda condicionado al servicio, que Peru y Chile tratan como no libre [doc:https://www.sat.gob.pe/TransparenciaV3/Portals/0/Docs/NormasOtrasEntidades/DecretoSupremo016-2024-JUS_ReglamentoLey29733_LeyProteccionDatosPersonales.pdf@DS-016-2024-JUS]
   270|- El mensaje de error habla de "terminos" que la etiqueta no menciona; al cambiar el texto del checkbox hay que cambiar tambien el de validacion en los 3 idiomas [repo:src/i18n/index.ts:65]
- Un enlace dentro de la etiqueta exige cambiar el atomo, que hoy escribe con `textContent`; armarlo con `innerHTML` desde el diccionario abre XSS si el texto llega a venir de fuera [repo:src/ui/atoms/acceptance.ts:32]
- Un enlace dentro de un `label` puede activar el checkbox al hacer clic; el enlace va fuera del label o con su propio manejo [repo:src/ui/atoms/acceptance.ts:29]
- WhatsApp exige que el opt-in nombre el canal y al negocio; un texto generico de "comunicarse conmigo" no lo cubre [doc:https://developers.facebook.com/docs/whatsapp/overview/getting-opt-in/@2026-10-01]
- La landing muestra una sola licencia (C118023331) y la fuente de Karen da dos; usar la que no corresponde en un aviso regulatorio es peor que no ponerla [doc:https://www.atfxlatam.com/es/training-sessions-25jun/@2026-10-01]
- No inventar el porcentaje de cuentas que pierden: la formula COBS lo define por proveedor [doc:https://handbook.fca.org.uk/handbook/cobs22/cobs22s5@2026-10-01]
- Brasil en la lista de paises y la pagina pt son indicio de oferta dirigida a Brasil; quitar el aviso CVM de pt no quita ese indicio [doc:https://conteudo.cvm.gov.br/export/sites/cvm/legislacao/pareceres-orientacao/anexos/pare033.pdf@2005-09-30]
- `role="alert"` en los 8 slots puede anunciar varios errores a la vez al enviar; un resumen enfocado o foco al primer error es mas predecible [repo:src/ui/atoms/error-message.ts:6]
- El thank-you reemplaza el nodo con foco: si no se le da foco, el lector de pantalla puede quedar en el inicio del documento [repo:src/core/form-engine.ts:134]
- El buscador del combobox dice "Buscar..." tambien en en y pt y no tiene label: falla 3.3.2 en esos idiomas [repo:src/ui/atoms/select.ts:81]
   280|- El tema oscuro usa fondos semitransparentes sobre el fondo del host: su contraste no se puede afirmar sin la landing real [repo:src/styles/forms.css:84]
- Turnstile sin siteverify en el servidor no protege nada, y el campo que agrega es un campo nuevo en el POST [doc:https://developers.cloudflare.com/turnstile/get-started/server-side-validation/@2026-10-01]
- Un honeypot con nombre autocompletable (name, country) se llena solo y descarta personas reales [ref:https://github.com/markets/invisible_captcha/blob/468719871737212fd197be6a33b6d8cdd44744cb/README.md#L114@4687198]
- Contexto navegador: todo lo de C1-C4 corre en el widget; los textos legales salen del bundle, no de atributos `data-*`, que hoy ya llevan valores sin validar hasta Salesforce [repo:src/index.ts:58]
- Contexto preview.html: no envia a admin-ajax por CORS, asi que ahi solo se prueba render, a11y y textos [repo:CLAUDE.md:122]
- Contexto tests: los criterios de C1 y C3 se prueban con DOM en `node --test`; el CI de release corre Node 20 sin tests, asi que no los protege hoy [repo:.github/workflows/release.yml:30]
- Contexto servidor: retencion, honeypot efectivo, Turnstile y rate limit viven en WordPress, el middleware y Salesforce; el widget no puede garantizarlos [repo:CLAUDE.md:105]

## 9. Incertidumbre

   290|- ASSUMPTION: `#f04438` sobre blanco da cerca de 3.8:1 (menos de 4.5:1) para el texto de error de 0.78em, y `#22d3ee` y `#d0d5dd` sobre blanco quedan bajo 3:1 para foco y bordes (calculo propio con la formula de luminancia). prueba: medir con axe o un verificador de contraste en la landing real, tema claro y oscuro
- ASSUMPTION: Elementor Pro (form #593) guarda envios en WordPress con IP y user-agent ("Collect Submissions"). prueba: revisar en wp-admin la configuracion del form #593 y una entrada de Submissions
- ASSUMPTION: el transitorio de la Ley 21.719 cae el 1 de diciembre de 2026 (mes 24 contando desde enero de 2025); una fuente secundaria dice 2027. prueba: confirmacion de Legal o de la BCN
- ASSUMPTION: el connector ignora claves `form_fields[...]` que no conoce, asi que un honeypot vacio no altera el lead. prueba: envio de prueba en incognito con un campo extra vacio y consulta read-only del Lead en SF
- ASSUMPTION: la version del bundle servida en una fecha se puede reconstruir con los tags de git y su fecha. prueba: `git log --tags --simplify-by-decoration --format='%ad %d'` contra el CreatedDate de un lead conocido
- [NEEDS CLARIFICATION: Legal - base legal por finalidad y pais: contacto sobre la solicitud (precontractual / consentimiento) vs marketing por email, WhatsApp y llamadas (consentimiento separado). Decide C1-B, C1-C o C1-D]
- [NEEDS CLARIFICATION: Karen - se autoriza un segundo campo de marketing (C1-B) o un dato de version de texto (R2/R3)? Hoy la regla de campos fijos lo impide]
- [NEEDS CLARIFICATION: Legal - texto exacto de la advertencia de riesgo por idioma y si lleva porcentaje; si lleva, la cifra y su fecha de calculo]
- [NEEDS CLARIFICATION: Legal - que licencia se publica: C113012295, C118023331 o ambas, y para que actividad es cada una]
- [NEEDS CLARIFICATION: Legal - texto en portugues del aviso Levycam / Parecer CVM 33/2005 para las paginas pt; hoy solo existe en ingles en atfx.com]
   300|- [NEEDS CLARIFICATION: Legal - los CFDs y el Margin FX que ofrece ATFX son "valores mobiliarios" en el sentido del Parecer 33, o rige otra norma CVM/BCB para Brasil?]
- [NEEDS CLARIFICATION: Legal - la politica de privacidad MU cubre a prospectos (leads) o solo a clientes? Hay version es/pt? Informa plazo de conservacion, como pide Peru art. 6.1.9?]
- [NEEDS CLARIFICATION: Legal - la tarifa de USD 10 por acceso de la politica MU es compatible con los derechos gratuitos de los paises atendidos?]
- [NEEDS CLARIFICATION: Legal - ATFX tiene "representacion comercial" en Brasil a efectos del art. 63 de la Lei 13.146 (accesibilidad obligatoria)?]
- [NEEDS CLARIFICATION: Legal - Peru: esta designado el representante del art. VII del Reglamento DS 016-2024-JUS?]
- [NEEDS CLARIFICATION: Legal - las guias de publicidad de la FSC Mauricio aplican a anuncios dirigidos a LATAM?]
- [NEEDS CLARIFICATION: Karen/IT - plazo de retencion del lead en WordPress, middleware y Salesforce, y quien lo ejecuta]
- [NEEDS CLARIFICATION: Karen/IT - D-20: Turnstile o rate limit en admin-ajax, con quien y cuando]
- Leido pero no citable: el texto de la LGPD (art. 5 XII, 6 III, 8 par. 1, 2, 4 y 5, 9, 16 y 46) y el art. 63 de la Lei 13.146 se leyeron en www2.camara.leg.br en esta corrida, pero el linter recibe HTTP 403 de ese host y planalto.gov.br da ECONNRESET; por eso la LGPD se cita via la guia de la ANPD y la Lei 13.146 via la lista del W3C. El art. 8 par. 1 (clausula destacada) y par. 4 (autorizaciones genericas nulas) quedan sin cita citable.
- No verificado: el texto de la Ley 1581 de 2012 (Colombia); funcionpublica.gov.co dio error de certificado y secretariasenado.gov.co rechazo la conexion; se cito el Decreto 1377, que la reglamenta. Guias de la SIC no consultadas.
   310|- No verificado: Ley 25.326 (Argentina) se leyo por resumen del fetcher sobre infoleg; el fetcher se nego a copiar el texto literal.
- No verificado: XM y Exness devolvieron 403; eToro no se consulto. Las paginas de registro de brokers no se pudieron leer: solo sus portadas.
- No verificado: Mexico, Peru, Chile y Ecuador no figuran en la lista de politicas de accesibilidad del W3C; no se busco su normativa propia.
- No verificado: el honeypot nativo de Elementor Pro; su codigo no es publico.
- Inyeccion sospechada en fuentes: ninguna.

## 10. Checklist de estandar

- [ ] C1: ningun checkbox de consentimiento nace marcado (test de render en es/en/pt)
- [ ] C1: ningun control obligatorio incluye una finalidad de marketing; si el marketing se pide en el form, es un control aparte y opcional (requiere decision de Karen sobre el campo)
   320|- [ ] C1: el texto del checkbox nombra la finalidad concreta y a la entidad responsable, y el mensaje de validacion usa las mismas palabras
- [ ] C1: si se pide opt-in para WhatsApp, el texto nombra el canal y al negocio
- [ ] C1: el enlace al aviso de privacidad esta visible junto al checkbox, abre la version del idioma de la pagina y no esta dentro del `label`
- [ ] C1: los textos de consentimiento viven en el diccionario con una version; cada cambio queda en CHANGELOG con fecha e idioma
- [ ] C1: el POST conserva exactamente los mismos campos y llaves (test de serializacion)
- [ ] C2: bajo el boton hay un bloque legal con advertencia de riesgo, entidad y licencia, y enlaces a privacidad y terminos, con textos firmados por Legal
- [ ] C2: la advertencia de riesgo tiene al menos el mismo tamaño de letra que el texto de la etiqueta del checkbox
- [ ] C2: en `data-lang="pt"` se muestra el aviso Levycam / CVM aprobado por Legal
- [ ] C2: ningun texto legal se lee de atributos `data-*`; todo sale del bundle
- [ ] C2: no se publica ningun porcentaje de perdidas que Legal no haya entregado
   330|- [ ] C3: nombre, apellido, email y telefono llevan `autocomplete` (given-name, family-name, email, tel-national)
- [ ] C3: un campo con error lleva `aria-invalid="true"` y `aria-describedby` hacia su mensaje
- [ ] C3: un submit invalido mueve el foco al primer campo con error o a un resumen de errores
- [ ] C3: tras exito el foco pasa al titulo del thank-you
- [ ] C3: el buscador del combobox tiene label y placeholder traducidos
- [ ] C3: texto de error con contraste de 4.5:1 o mas; foco y bordes de controles con 3:1 o mas, medido en tema claro y oscuro
- [ ] C3: todo el form se completa y envia solo con teclado (prueba manual documentada)
- [ ] C4: honeypot fuera del arbol accesible (`aria-hidden`, `tabindex="-1"`, nombre no autocompletable); si se llena, no hay fetch y se muestra el thank-you
- [ ] C4: el widget no guarda datos personales en localStorage, sessionStorage ni cookies
- [ ] C4: Turnstile, rate limit y retencion quedan escalados a IT/Legal por escrito, no implementados en el widget
   340|- [ ] Ningun texto legal se publica sin la firma de Legal de ATFX

## 11. Fuentes

| n | Titulo | Editor | Version o fecha | Consultado | Confianza |
|---|---|---|---|---|---|
| 1 | Guidelines 05/2020 on consent under Regulation 2016/679 | EDPB | v1.1, 2020-05-04 | 2026-10-01 | high |
| 2 | Guia orientativo Cookies e protecao de dados pessoais (cita LGPD art. 6, 8, 9) | ANPD | v1.0, oct 2022 | 2026-10-01 | medium |
| 3 | Ley Federal de Proteccion de Datos Personales en Posesion de los Particulares | Camara de Diputados | DOF 2025-03-20, ult. reforma 2025-11-14 | 2026-10-01 | high |
| 4 | Decreto 1377 de 2013 (copia SUIN-Juriscol) | Unidad para las Victimas (gov.co) | 2013-06-27 | 2026-10-01 | high |
   350|| 5 | Reglamento de la Ley 29733, DS 016-2024-JUS | SAT Lima (gob.pe) | 2024-11-30 | 2026-10-01 | high |
| 6 | Ley 25.326 texto actualizado | InfoLEG | vigente | 2026-10-01 | medium |
| 7 | Ley Organica de Proteccion de Datos Personales | gob.ec | RO 459, 2021-05-26 | 2026-10-01 | high |
| 8 | Ley 21.719 | Diario Oficial de Chile | 2024-12-13 | 2026-10-01 | high |
| 9 | WhatsApp - Getting opt-in | Meta | 2026-10-01 | 2026-10-01 | medium |
| 10 | Parecer de Orientacao CVM 33 | CVM | 2005-09-30 | 2026-10-01 | high |
| 11 | Guidelines for Advertising and Marketing of Financial Products | FSC Mauritius | 2016-04-01 | 2026-10-01 | high |
| 12 | COBS 22.5 | FCA | 2026-10-01 | 2026-10-01 | high |
| 13 | Landing training-sessions-25jun (pie legal) | ATFX LATAM | 2026-10-01 | 2026-10-01 | high |
| 14 | atfx.com company news (pie legal) | ATFX | 2026-10-01 | 2026-10-01 | high |
   360|| 15 | Privacy and Internal Privacy Controls Policy (MU, EN) | AT Global Markets Intl Ltd | 2024-04-22 | 2026-10-01 | high |
| 16 | WCAG 2.2; Understanding 1.3.5 y 1.4.11 | W3C | 2.2, 2024-12-12 | 2026-10-01 | high |
| 17 | Web Accessibility Laws and Policies | W3C WAI | 2026-10-01 | 2026-10-01 | medium |
| 18 | Ley 26.653 | InfoLEG | 2010 | 2026-10-01 | medium |
| 19 | Turnstile server-side validation | Cloudflare | 2026-10-01 | 2026-10-01 | high |
| 20 | contact-form-7 modules/acceptance.php | rocklobster-in | @488ad8d | 2026-10-01 | high |
| 21 | govuk-frontend error-summary, error-message, input | alphagov | @283cc58 | 2026-10-01 | high |
| 22 | laravel-honeypot view y config | spatie | @407d5ba | 2026-10-01 | high |
| 23 | invisible_captcha README | markets | @4687198 | 2026-10-01 | medium |
| 24 | Pepperstone portada (Bahamas) | Pepperstone | 2026-10-01 | 2026-10-01 | low |
   370|| 25 | IC Markets global portada (Seychelles) | Raw Trading Ltd | 2026-10-01 | 2026-10-01 | low |
