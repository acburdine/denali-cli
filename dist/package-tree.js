"use strict";
const lodash_1 = require("lodash");
const path = require("path");
const fs = require("fs");
const Plugin = require("broccoli-plugin");
const glob = require("glob");
const mkdirp = require("mkdirp");
/**
 * Denali CLI's build system is based on Broccoli, which, while quite powerful for our use case, has
 * a specific flaw: you can't operate on files in the root directory that you are building. This
 * plugin is a hack around that - it skips Broccoli's input trees and copies files directly out of
 * the package root. The drawback is that Broccoli's natural file-watching mechanisms will fail
 * here, but that's typically fine since these files either don't matter at runtime, or would
 * require full restarts anyway.
 */
class PackageTree extends Plugin {
    constructor(builder, options) {
        super([], options);
        this.builder = builder;
        this.dir = builder.dir;
        this.files = options.files;
    }
    /**
     * Copy the package files over
     */
    build() {
        // Copy over any top level files specified
        this.files.forEach((pattern) => {
            glob.sync(pattern, { cwd: this.dir, nodir: true }).forEach((file) => {
                let src = path.join(this.dir, file);
                let dest = path.join(this.outputPath, file);
                if (fs.existsSync(src)) {
                    mkdirp.sync(path.dirname(dest));
                    fs.writeFileSync(dest, fs.readFileSync(src));
                }
            });
        });
        // Addons should publish their dist directories, not the root project directory. To enforce
        // this, the addon blueprint ships with a prepublish script that fails immediately, telling the
        // user to run `denali publish` instead (which tests the addon, builds it, then runs npm publish
        // from the dist folder). However, `denali publish` itself would get blocked by our prepublish
        // blocker too, so when we build an addon, we remove that blocker. But if the user has changed
        // the prepublish script, then we leave it alone.
        let scripts = this.builder.pkg.scripts;
        if (scripts && scripts.prepublish && scripts.prepublish.includes("Use 'denali publish' instead.")) {
            let pkg = lodash_1.cloneDeep(this.builder.pkg);
            delete pkg.scripts.prepublish;
            fs.writeFileSync(path.join(this.outputPath, 'package.json'), JSON.stringify(pkg, null, 2));
        }
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PackageTree;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS10cmVlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3BhY2thZ2UtdHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsbUNBRWdCO0FBQ2hCLDZCQUE2QjtBQUM3Qix5QkFBeUI7QUFDekIsMENBQTBDO0FBQzFDLDZCQUE2QjtBQUM3QixpQ0FBaUM7QUFHakM7Ozs7Ozs7R0FPRztBQUNILGlCQUFpQyxTQUFzQyxNQUFPO0lBc0I1RSxZQUFZLE9BQWdCLEVBQUUsT0FBNEI7UUFDeEQsS0FBSyxDQUFDLEVBQUUsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNuQixJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2QixJQUFJLENBQUMsR0FBRyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUM7UUFDdkIsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUs7UUFDViwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPO1lBQ3pCLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSTtnQkFDOUQsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUNwQyxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQzVDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN2QixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDaEMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUMvQyxDQUFDO1lBQ0gsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILDJGQUEyRjtRQUMzRiwrRkFBK0Y7UUFDL0YsZ0dBQWdHO1FBQ2hHLDhGQUE4RjtRQUM5Riw4RkFBOEY7UUFDOUYsaURBQWlEO1FBQ2pELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQztRQUN2QyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksT0FBTyxDQUFDLFVBQVUsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRyxJQUFJLEdBQUcsR0FBRyxrQkFBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEMsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztZQUM5QixFQUFFLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3RixDQUFDO0lBQ0gsQ0FBQztDQUVGOztBQTNERCw4QkEyREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBjbG9uZURlZXBcbn0gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQbHVnaW4gZnJvbSAnYnJvY2NvbGktcGx1Z2luJztcbmltcG9ydCAqIGFzIGdsb2IgZnJvbSAnZ2xvYic7XG5pbXBvcnQgKiBhcyBta2RpcnAgZnJvbSAnbWtkaXJwJztcbmltcG9ydCBCdWlsZGVyLCB7IFRyZWUgfSBmcm9tICcuL2J1aWxkZXInO1xuXG4vKipcbiAqIERlbmFsaSBDTEkncyBidWlsZCBzeXN0ZW0gaXMgYmFzZWQgb24gQnJvY2NvbGksIHdoaWNoLCB3aGlsZSBxdWl0ZSBwb3dlcmZ1bCBmb3Igb3VyIHVzZSBjYXNlLCBoYXNcbiAqIGEgc3BlY2lmaWMgZmxhdzogeW91IGNhbid0IG9wZXJhdGUgb24gZmlsZXMgaW4gdGhlIHJvb3QgZGlyZWN0b3J5IHRoYXQgeW91IGFyZSBidWlsZGluZy4gVGhpc1xuICogcGx1Z2luIGlzIGEgaGFjayBhcm91bmQgdGhhdCAtIGl0IHNraXBzIEJyb2Njb2xpJ3MgaW5wdXQgdHJlZXMgYW5kIGNvcGllcyBmaWxlcyBkaXJlY3RseSBvdXQgb2ZcbiAqIHRoZSBwYWNrYWdlIHJvb3QuIFRoZSBkcmF3YmFjayBpcyB0aGF0IEJyb2Njb2xpJ3MgbmF0dXJhbCBmaWxlLXdhdGNoaW5nIG1lY2hhbmlzbXMgd2lsbCBmYWlsXG4gKiBoZXJlLCBidXQgdGhhdCdzIHR5cGljYWxseSBmaW5lIHNpbmNlIHRoZXNlIGZpbGVzIGVpdGhlciBkb24ndCBtYXR0ZXIgYXQgcnVudGltZSwgb3Igd291bGRcbiAqIHJlcXVpcmUgZnVsbCByZXN0YXJ0cyBhbnl3YXkuXG4gKi9cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFBhY2thZ2VUcmVlIGV4dGVuZHMgKDxuZXcoLi4uYXJnczogYW55W10pID0+IFRyZWU+UGx1Z2luKSB7XG5cbiAgLyoqXG4gICAqIFRoZSBCdWlsZGVyIGluc3RhbmNlIHRoYXQgdGhpcyBQYWNrYWdlVHJlZSBpcyBwYXJ0IG9mXG4gICAqL1xuICBwcm90ZWN0ZWQgYnVpbGRlcjogQnVpbGRlcjtcblxuICAvKipcbiAgICogVGhlIHJvb3QgZGlyZWN0b3J5IG9mIHRoZSBwYWNrYWdlXG4gICAqL1xuICBwcm90ZWN0ZWQgZGlyOiBzdHJpbmc7XG5cbiAgLyoqXG4gICAqIEFuIGFycmF5IG9mIGZpbGVwYXRocyB0aGF0IHNob3VsZCBiZSBjb3BpZWRcbiAgICovXG4gIHByb3RlY3RlZCBmaWxlczogc3RyaW5nW107XG5cbiAgLyoqXG4gICAqIFRoZSBkZXN0aW5hdGlvbiBkaXJlY3RvcnlcbiAgICovXG4gIHByb3RlY3RlZCBvdXRwdXRQYXRoOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3IoYnVpbGRlcjogQnVpbGRlciwgb3B0aW9uczogeyBmaWxlczogc3RyaW5nW10gfSkge1xuICAgIHN1cGVyKFtdLCBvcHRpb25zKTtcbiAgICB0aGlzLmJ1aWxkZXIgPSBidWlsZGVyO1xuICAgIHRoaXMuZGlyID0gYnVpbGRlci5kaXI7XG4gICAgdGhpcy5maWxlcyA9IG9wdGlvbnMuZmlsZXM7XG4gIH1cblxuICAvKipcbiAgICogQ29weSB0aGUgcGFja2FnZSBmaWxlcyBvdmVyXG4gICAqL1xuICBwdWJsaWMgYnVpbGQoKTogdm9pZCB7XG4gICAgLy8gQ29weSBvdmVyIGFueSB0b3AgbGV2ZWwgZmlsZXMgc3BlY2lmaWVkXG4gICAgdGhpcy5maWxlcy5mb3JFYWNoKChwYXR0ZXJuKSA9PiB7XG4gICAgICBnbG9iLnN5bmMocGF0dGVybiwgeyBjd2Q6IHRoaXMuZGlyLCBub2RpcjogdHJ1ZSB9KS5mb3JFYWNoKChmaWxlKSA9PiB7XG4gICAgICAgIGxldCBzcmMgPSBwYXRoLmpvaW4odGhpcy5kaXIsIGZpbGUpO1xuICAgICAgICBsZXQgZGVzdCA9IHBhdGguam9pbih0aGlzLm91dHB1dFBhdGgsIGZpbGUpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhzcmMpKSB7XG4gICAgICAgICAgbWtkaXJwLnN5bmMocGF0aC5kaXJuYW1lKGRlc3QpKTtcbiAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGRlc3QsIGZzLnJlYWRGaWxlU3luYyhzcmMpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICAvLyBBZGRvbnMgc2hvdWxkIHB1Ymxpc2ggdGhlaXIgZGlzdCBkaXJlY3Rvcmllcywgbm90IHRoZSByb290IHByb2plY3QgZGlyZWN0b3J5LiBUbyBlbmZvcmNlXG4gICAgLy8gdGhpcywgdGhlIGFkZG9uIGJsdWVwcmludCBzaGlwcyB3aXRoIGEgcHJlcHVibGlzaCBzY3JpcHQgdGhhdCBmYWlscyBpbW1lZGlhdGVseSwgdGVsbGluZyB0aGVcbiAgICAvLyB1c2VyIHRvIHJ1biBgZGVuYWxpIHB1Ymxpc2hgIGluc3RlYWQgKHdoaWNoIHRlc3RzIHRoZSBhZGRvbiwgYnVpbGRzIGl0LCB0aGVuIHJ1bnMgbnBtIHB1Ymxpc2hcbiAgICAvLyBmcm9tIHRoZSBkaXN0IGZvbGRlcikuIEhvd2V2ZXIsIGBkZW5hbGkgcHVibGlzaGAgaXRzZWxmIHdvdWxkIGdldCBibG9ja2VkIGJ5IG91ciBwcmVwdWJsaXNoXG4gICAgLy8gYmxvY2tlciB0b28sIHNvIHdoZW4gd2UgYnVpbGQgYW4gYWRkb24sIHdlIHJlbW92ZSB0aGF0IGJsb2NrZXIuIEJ1dCBpZiB0aGUgdXNlciBoYXMgY2hhbmdlZFxuICAgIC8vIHRoZSBwcmVwdWJsaXNoIHNjcmlwdCwgdGhlbiB3ZSBsZWF2ZSBpdCBhbG9uZS5cbiAgICBsZXQgc2NyaXB0cyA9IHRoaXMuYnVpbGRlci5wa2cuc2NyaXB0cztcbiAgICBpZiAoc2NyaXB0cyAmJiBzY3JpcHRzLnByZXB1Ymxpc2ggJiYgc2NyaXB0cy5wcmVwdWJsaXNoLmluY2x1ZGVzKFwiVXNlICdkZW5hbGkgcHVibGlzaCcgaW5zdGVhZC5cIikpIHtcbiAgICAgIGxldCBwa2cgPSBjbG9uZURlZXAodGhpcy5idWlsZGVyLnBrZyk7XG4gICAgICBkZWxldGUgcGtnLnNjcmlwdHMucHJlcHVibGlzaDtcbiAgICAgIGZzLndyaXRlRmlsZVN5bmMocGF0aC5qb2luKHRoaXMub3V0cHV0UGF0aCwgJ3BhY2thZ2UuanNvbicpLCBKU09OLnN0cmluZ2lmeShwa2csIG51bGwsIDIpKTtcbiAgICB9XG4gIH1cblxufVxuIl19