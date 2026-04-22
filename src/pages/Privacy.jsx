export default function Privacy() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-display font-bold mb-10">Bidzo Privātuma Politika</h1>

      <div className="space-y-8 text-muted-foreground leading-relaxed">

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">1. Vispārīgā informācija</h2>
          <p>Šī privātuma politika ("Politika") izskaidro, kā platforma Bidzo ("Platforma") apstrādā Lietotāju personas datus.</p>
          <p className="mt-2">Izmantojot Platformu, Lietotājs piekrīt šai Politikai.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">2. Kādi dati tiek vākti</h2>
          <p>Bidzo var vākt un apstrādāt šādus personas datus:</p>
          
          <h3 className="font-semibold text-foreground mt-4">2.1. Reģistrācijas dati:</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>vārds vai lietotājvārds</li>
            <li>e-pasta adrese</li>
            <li>parole (šifrētā veidā)</li>
          </ul>

          <h3 className="font-semibold text-foreground mt-4">2.2. Platformas lietošanas dati:</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>sludinājumu informācija</li>
            <li>komunikācija ar citiem Lietotājiem</li>
            <li>aktivitāte Platformā</li>
          </ul>

          <h3 className="font-semibold text-foreground mt-4">2.3. Tehniskie dati:</h3>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>IP adrese</li>
            <li>ierīces informācija</li>
            <li>pārlūkprogrammas dati</li>
            <li>sīkdatnes (cookies)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">3. Kāpēc dati tiek vākti</h2>
          <p>Personas dati tiek izmantoti šādiem mērķiem:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>konta izveidei un uzturēšanai</li>
            <li>Platformas funkcionalitātes nodrošināšanai</li>
            <li>saziņai ar Lietotāju</li>
            <li>drošības un krāpniecības novēršanai</li>
            <li>Platformas uzlabošanai</li>
          </ul>
          <p className="mt-3">Bidzo neizmanto personas datus nelegāliem vai ar Platformu nesaistītiem mērķiem.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">4. Datu glabāšana un drošība</h2>
          <p>Bidzo veic saprātīgus tehniskos un organizatoriskos pasākumus, lai aizsargātu Lietotāju datus.</p>
          <p className="mt-3">Dati tiek:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>uzglabāti drošos serveros</li>
            <li>aizsargāti pret nesankcionētu piekļuvi</li>
          </ul>
          <p className="mt-3">Tomēr jāņem vērā, ka neviena sistēma nav pilnībā droša.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">5. Datu nodošana trešajām pusēm</h2>
          <p>Bidzo nepārdod Lietotāju personas datus trešajām pusēm.</p>
          <p className="mt-3">Dati var tikt nodoti tikai:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>ja to pieprasa likums</li>
            <li>ja tas nepieciešams Platformas darbībai (piemēram, maksājumu pakalpojumu sniedzējiem kā Stripe)</li>
            <li>lai nodrošinātu Platformas funkcionalitāti</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">6. Sīkdatnes (Cookies)</h2>
          <p>Platforma var izmantot sīkdatnes, lai:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>uzlabotu lietošanas pieredzi</li>
            <li>analizētu trafiku</li>
            <li>saglabātu Lietotāja preferences</li>
          </ul>
          <p className="mt-3">Lietotājs var kontrolēt sīkdatnes savā pārlūkprogrammā.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">7. Lietotāja tiesības (GDPR)</h2>
          <p>Saskaņā ar GDPR Lietotājam ir tiesības:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>piekļūt saviem datiem</li>
            <li>labot neprecīzus datus</li>
            <li>pieprasīt datu dzēšanu</li>
            <li>ierobežot datu apstrādi</li>
            <li>iebilst pret datu apstrādi</li>
            <li>pieprasīt datu pārnesamību</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">8. Datu dzēšana</h2>
          <p>Lietotājs var pieprasīt savu datu dzēšanu:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>sazinoties ar Bidzo</li>
            <li>vai dzēšot savu kontu (ja funkcija pieejama)</li>
          </ul>
          <p className="mt-3">Pēc pieprasījuma:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>dati tiks dzēsti vai anonimizēti saprātīgā termiņā</li>
            <li>izņemot gadījumus, kad dati jāglabā likuma dēļ</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">9. Datu glabāšanas ilgums</h2>
          <p>Personas dati tiek glabāti:</p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>tik ilgi, kamēr Lietotāja konts ir aktīvs</li>
            <li>vai tik ilgi, cik nepieciešams juridisko prasību izpildei</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">10. Izmaiņas politikā</h2>
          <p>Bidzo patur tiesības mainīt šo Politiku jebkurā laikā.</p>
          <p className="mt-2">Izmaiņas stājas spēkā pēc to publicēšanas Platformā.</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">11. Kontakti</h2>
          <p>Ja Lietotājam ir jautājumi par datu apstrādi, viņš var sazināties ar Bidzo, izmantojot Platformā norādīto kontaktinformāciju.</p>
        </section>

      </div>
    </div>
  );
}