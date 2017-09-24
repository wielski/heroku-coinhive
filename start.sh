APP_PREFIX=$(cat /dev/random | LC_CTYPE=C tr -dc "a-z" | head -c 2; cat /dev/random | LC_CTYPE=C tr -dc "a-z0-9" | head -c 6)
#destroy old workers
for app in $(heroku apps); do heroku apps:destroy --app $app --confirm $app; done
#create workers group & main worker
heroku apps:create $APP_PREFIX-0 --stack=cedar-14 --buildpack=https://github.com/heroku/heroku-buildpack-xvfb-google-chrome
heroku buildpacks:add heroku/nodejs -a $APP_PREFIX-0
heroku pipelines:create coinhive --app=$APP_PREFIX-0 --stage=staging
#push and build
heroku git:remote -a $APP_PREFIX-0
git push heroku master
#create worker clones
 for i in {1..4}; do heroku apps:create $APP_PREFIX-$i --stack=cedar-14 --buildpack=https://github.com/heroku/heroku-buildpack-xvfb-google-chrome; heroku buildpacks:add heroku/nodejs -a $APP_PREFIX-$i; heroku pipelines:add coinhive --app=$APP_PREFIX-$i --stage=production; done
heroku pipelines:promote --app=$APP_PREFIX-0
#start workers
for i in {0..4}; do heroku ps:scale worker=1 worker2=1 web=0 --app=$APP_PREFIX-$i; done
