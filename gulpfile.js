const gulp = require('gulp');
const zip = require('gulp-zip');
const exec = require('child_process').exec;
const fs = require('fs');
const jsdoc = require('gulp-jsdoc3');
const ftp = require( 'vinyl-ftp' );
const gutil = require( 'gulp-util' );
const argv = require('yargs').argv;

const src_dir = 'extension';
const dest_dir = 'build';
const dest_dir2 = 'build\\source';
const dest_dir3 = 'build\\toolbox\\edgeextension\\manifest\\';
const package_dir = 'build/toolbox/edgeextension/package';
const output_dir = 'build/output';
const assets = 'edgeAssets';

const makeDocs = argv.docs;
const publishFTP = argv.ftp;

function execute(execCommand, callback) {
    exec(execCommand, function (err, stdout, stderr) {
        console.log('stdout:', stdout);
        console.log('stderr:', stderr);
        console.log('err:', err);

        let success = stderr ? false : true;
        callback(success);
    });
}

// Tasks
gulp.task('zip', function() {
    console.log(process.cwd());

    let ignores = fs.readFileSync(src_dir+'/.buildignore').toString().split("\n");
    for (let i = 0; i < ignores.length; i++) {
        if (ignores[i].startsWith("/")) {
            ignores[i] = "!"+src_dir+ignores[i];
        }
        else {
            ignores[i] = "!"+ignores[i];
        }
    }
    return gulp.src([src_dir+'/**'].concat(ignores))
        .pipe(zip('moderator-toolbox.zip'))
        .pipe(gulp.dest(output_dir));
});

gulp.task('manifoldJS', function() {
    console.log(process.cwd());

    let ignores = fs.readFileSync(src_dir+'/.buildignore').toString().split("\n");
    for (let i = 0; i < ignores.length; i++) {
        if (ignores[i].startsWith("/")) {
            ignores[i] = "!"+src_dir+ignores[i];
        }
        else {
            ignores[i] = "!"+ignores[i];
        }
    }

    gulp.src([src_dir+'/**'].concat(ignores))
        .pipe(gulp.dest(dest_dir2));


    // Hacky? Yes, very much but it seems to work

    execute(`manifoldjs -l error -p edgeextension -f edgeextension -m ${dest_dir2}\\manifest.json -d ${dest_dir}`, function(result) {
        if(result) {
            gulp.src([assets+'/**'])
                .pipe(gulp.dest(dest_dir3+'\\Assets'));
            let appxManifestXML = fs.readFileSync(`${dest_dir3}/appxmanifest.xml`).toString();

            appxManifestXML = appxManifestXML.replace('INSERT-YOUR-PACKAGE-IDENTITY-NAME-HERE', '2471toolboxTeam.moderatortoolboxforreddit');
            appxManifestXML = appxManifestXML.replace('CN=INSERT-YOUR-PACKAGE-IDENTITY-PUBLISHER-HERE', 'CN=8F6C891B-BA96-48EA-AFFE-227374B8192B');
            appxManifestXML = appxManifestXML.replace('INSERT-YOUR-PACKAGE-PROPERTIES-PUBLISHERDISPLAYNAME-HERE', 'toolboxTeam');
            appxManifestXML = appxManifestXML.replace(/Version="\d\.(\d\.\d\.\d)" \/>/, 'Version="$1.0" />');

            fs.writeFileSync(`${dest_dir3}/appxmanifest.xml`, appxManifestXML, 'utf8', function(err) {
                if (err) {
                    throw err;
                }
                console.log('The file has been saved!');
            });
            execute(`manifoldjs -l debug -p edgeextension package ${dest_dir3} -d ${dest_dir}`, function(result) {
                if(result) {

                    gulp.src([package_dir+'/**'])
                        .pipe(gulp.dest(output_dir));

                    console.log('edge package build');
                } else {
                    console.log('problem executing second manifoldJS round');
                }

            });
        } else {
            console.log('problem executing first manifoldJS round');
        }
    });
});



gulp.task('doc', function (cb) {
    if(makeDocs) {
        const jsdocConfig = require('./jsdoc.json');
        gulp.src(['./extension/data/modules/*.js', './extension/data/*.js'], {read: false})
            .pipe(jsdoc(jsdocConfig, cb));
    } else {
        cb()
    }

});


gulp.task('doc2ftp', ['doc'], function (cb) {
    if (fs.existsSync('ftpconfig.json') && publishFTP) {
        const ftpConfig= JSON.parse(fs.readFileSync('ftpconfig.json', "utf8"));
        ftpConfig.log = gutil.log;
        const conn = ftp.create(ftpConfig);
        const globs = [
            'docs/**'
        ];
        return gulp.src( globs, { base: '.', buffer: false } )
        .pipe( conn.newer( '/' ) ) // only upload newer files
        .pipe( conn.dest( '/' ) );
    } else {
       cb()
    }

});


gulp.task('default', ['zip', 'manifoldJS', 'doc', 'doc2ftp']);

