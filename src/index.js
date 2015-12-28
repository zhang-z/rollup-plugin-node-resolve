import { dirname } from 'path';
import builtins from 'builtin-modules';
import resolve from 'resolve';

function valid ( option, id ) {
	if ( Object.prototype.toString.call( option ) === '[object Array]' ) {
		return ~option.indexOf( id );
	}

	return option;
}

export default function npm ( options ) {
	options = options || {};

	const skip = options.skip || [];
	if ( !( 'main' in options ) ) options.main = true;

	return {
		resolveId( importee, importer ) {
			const parts = importee.split( /[\/\\]/ );
			const id = parts.shift();

			if ( ~skip.indexOf(id) ) return null;

			// disregard entry modules and builtins
			if ( !importer || ~builtins.indexOf( importee )  ) return null;

			return new Promise( ( accept, reject ) => {
				resolve(
					importee,
					{
						basedir: dirname( importer ),
						packageFilter ( pkg ) {
							const id = pkg[ 'name' ] || importee;
							const useJsnext = valid( options.jsnext, id );
							const useMain = valid( options.main, id );

							if ( useJsnext ) {
								const main = pkg[ 'jsnext:main' ];
								if ( main ) {
									pkg[ 'main' ] = main;
								} else if ( !useMain ) {
									reject( Error( `Package ${id} (imported by ${importer}) does not have a jsnext:main field. You should either allow legacy modules with options.main, or skip it with options.skip = ['${id}'])` ) );
								}
							} else if ( !useMain ) {
								reject( Error( `To import from a package in node_modules (${id}), either options.jsnext or options.main must be true` ) );
							}

							return pkg;
						}
					},
					( err, resolved ) => err ? reject( err ) : accept( resolved )
				);
			});
		}
	};
}
