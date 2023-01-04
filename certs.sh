openssl req -x509 -nodes -newkey rsa:2048 \
  -subj '/C=XX/ST=XXXX/L=XXXX/O=XXXX/OU=XXXX/CN=riotgames.com/emailAddress=contact@riotgames.com' \
  -addext 'subjectAltName = DNS:www.riotgames.com, DNS:*.riotgames.com, DNS:*.rpg.riotgames.com, DNS:*.vts.si.riotgames.com' \
  -keyout riot.key \
  -out riot.crt