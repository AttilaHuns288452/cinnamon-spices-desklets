/* === Vinyl Record Player Desklet === */
const Desklet = imports.ui.desklet;
const Cinnamon = imports.gi.Cinnamon;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;

const RecordPlayer = class {
    constructor(metadata, desklet) {
        this._metadata = metadata;
        this._desklet = desklet;
        this._settings = new Cinnamon.AppletSettings(metadata.uuid, metadata.uuid);

        // Settings: playing (bool), speed (33 or 45)
        this._settings.bindProperty('', 'playing', 'playing',
            () => this._onSettingsChanged(), true, false);
        this._settings.bindProperty('', 'speed', 'speed',
            () => this._onSettingsChanged(), true, 33);
        this._settings.setDefault('playing', true);
        this._settings.setDefault('speed', 33);

        this._elapsed = 0;
        this._startTime = 0;
        this._angle = 0;
        this._rate = 0;

        this._initLayout();
        this._onSettingsChanged();
    }

    _initLayout() {
        this._layout = new St.Bin({
            style_class: 'vinyl-desklet-bin',
            reactive: true,
        });

        this._desklet.layout = new St.BoxLayout({ style_class: 'vinyl-desklet-panel' });

        // Turntable platter (outer ring)
        this._platter = new St.Bin({
            style_class: 'vinyl-platter',
            x_expand: true,
            y_expand: true,
        });

        // Record
        this._record = new St.Bin({
            style_class: 'vinyl-record',
        });

        // Label
        this._label = new St.Bin({
            style_class: 'vinyl-label',
        });

        // Spindle
        this._spindle = new St.Bin({
            style_class: 'vinyl-spindle',
        });

        // Tonearm group
        this._armGroup = new St.Group();
        this._armBase = new St.Bin({ style_class: 'arm-base' });
        this._armBody = new St.Bin({ style_class: 'arm-body' });

        this._armGroup.add_child(this._armBase);
        this._armGroup.add_child(this._armBody);

        // Popup menu for controls
        this._menuManager = new Desklet.DeskletManager(this);
        this._popupManager = new Cinnamon.PopupMenu.PopupMenuManager(this._layout);
        this._popupMenu = new Cinnamon.PopupMenu.PopupMenu(this._layout, 0);

        const playItem = new PopupMenu.PopupMenuItem('Play / Pause');
        playItem.connect('activated', () => this._togglePlay());
        this._popupMenu.addMenuItem(playItem);

        const separator = new PopupMenu.PopupSeparatorMenuItem();
        this._popupMenu.addMenuItem(separator);

        const speed33 = new PopupMenu.PopupMenuItem('33 RPM');
        speed33.connect('activated', () => this._setSpeed(33));
        this._popupMenu.addMenuItem(speed33);

        const speed45 = new PopupMenu.PopupMenuItem('45 RPM');
        speed45.connect('activated', () => this._setSpeed(45));
        this._popupMenu.addMenuItem(speed45);

        this._popupManager.setMenu(this._popupMenu);

        // Layout: record on top of platter
        this._desklet.layout.add_child(this._platter);
        this._desklet.layout.add_child(this._record);
        this._desklet.layout.add_child(this._label);
        this._desklet.layout.add_child(this._spindle);
        this._desklet.layout.add_child(this._armGroup);

        // Header
        this._desklet.header.add_child(this._desklet.layout);

        // Click to toggle
        this._desklet.header.actor.connect('button-press-event', (actor, event) => {
            this._togglePlay();
            return Clutter.EVENT_STOP;
        });
    }

    _togglePlay() {
        const playing = this._settings.get_property('playing');
        this._settings.setProperty('playing', !playing);
    }

    _setSpeed(rpm) {
        this._settings.setProperty('speed', rpm);
    }

    _onSettingsChanged() {
        const playing = this._settings.get_property('playing');
        if (playing && !this._rate) {
            this._startTime = Date.now();
        }
        this._rate = playing ? 1 : 0;
    }

    onUpdate() {
        if (!this._rate) return;

        const playing = this._settings.get_property('playing');
        const speed = this._settings.get_property('speed');
        const msPerRev = (speed === 45) ? 60000 / 45 : 60000 / 33;

        const elapsed = Date.now() - this._startTime;
        const revs = elapsed / msPerRev;
        this._angle = (revs * 360) % 360;

        // Apply rotation via CSS transform using clutter transform
        const transform = new Clutter.Transform();
        transform.rotate(Z_AXIS, this._angle * Math.PI / 180);
        this._record.set_transform(transform);
        this._label.set_transform(transform.clone());
    }

    onLookupStyle() {
        this._desklet.set_style('vinyl-desklet');
    }
};

function main(metadata, desklet, callback) {
    const player = new RecordPlayer(metadata, desklet);
    callback(player);
}
