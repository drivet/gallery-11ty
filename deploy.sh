PATH=~/.nvm/versions/node/v22.13.0/bin:$PATH
npm install
npm run build
rsync -a _site ubuntu@remote.desmondrivet.com:/var/www/gallery.desmondrivet.com/
