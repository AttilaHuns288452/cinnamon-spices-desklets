/* === Vinyl Record Player Desklet === */
const Desklet = imports.ui.desklet;
const Cinnamon = imports.gi.Cinnamon;
const St = imports.gi.St;
const Clutter = imports.gi.Clutter;
const Main = imports.ui.main;
const PopupMenu = imports.ui.popupMenu;

const RecordPlayer = class {
    constructor(metadata, desklet) {
        this._metadata = metadata;
        this._desklet = desklet;
        this._settings = new Cinnamon.AppletSettings(metadata.uuid, metadata.uuid);

        // Bind color + control settings
        this._settings.bindProperty('', 'fontColor', 'fontColor',
            () => this._applyColors(), true, false);
        this._settings.bindProperty('', 'playerColor', 'playerColor',
            () => this._applyColors(), true, false);
        this._settings.bindProperty('', 'recordColor', 'recordColor',
            () => this._applyColors(), true, false);
        this._settings.bindProperty('', 'labelColor', 'labelColor',
            () => this._applyColors(), true, false);
        this._settings.bindProperty('', 'playing', 'playing',
            () => this._onSettingsChanged(), true, false);
        this._settings.bindProperty('', 'speed', 'speed',
            () => this._onSettingsChanged(), true, 33);

        this._settings.setDefault('fontColor', '#b4afa5');
        this._settings.setDefault('playerColor', '#5a4a3a');
        this._settings.setDefault('recordColor', '#111111');
        this._settings.setDefault('labelColor', '#c4b089');
        this._settings.setDefault('playing', true);
        this._settings.setDefault('speed', 33);

        this._angle = 0;
        this._startTime = 0;
        this._rate = 0;

        this._initLayout();
        this._applyColors();
        this._onSettingsChanged();
    }

    _initLayout() {
        // Container bin — acts as our positioning canvas
        this._canvas = new St.Bin({
            style_class: 'vinyl-canvas',
            width: 200,
            height: 200,
        });

        // Platter (circular via CSS border-radius)
        this._platter = new St.Bin({ style_class: 'vinyl-platter' });
        this._platter.set_position(18, 18);
        this._platter.set_size(164, 164);
        this._canvas.add_child(this._platter);

        // Record
        this._record = new St.Bin({ style_class: 'vinyl-record' });
        this._record.set_position(28, 28);
        this._record.set_size(144, 144);
        this._canvas.add_child(this._record);

        // Center label
        this._label = new St.Bin({ style_class: 'vinyl-label' });
        this._label.set_position(70, 70);
        this._label.set_size(60, 60);
        this._canvas.add_child(this._label);

        // Spindle
        this._spindle = new St.Bin({ style_class: 'vinyl-spindle' });
        this._spindle.set_position(95, 95);
        this._spindle.set_size(10, 10);
        this._canvas.add_child(this._spindle);

        // Tonearm
        this._armBase = new St.Bin({ style_class: 'arm-base' });
        this._armBase.set_position(150, 22);
        this._armBase.set_size(12, 12);
        this._canvas.add_child(this._armBase);

        this._armBody = new St.Bin({ style_class: 'arm-body' });
        this._armBody.set_position(156, 28);
        this._armBody.set_size(80, 4);
        this._canvas.add_child(this._armBody);
        // Rotate arm ~35deg from vertical
        this._armBody.rotation_angle_z = 35;
        this._armBody.set_pivot_point(0, 0.5);

        // Title text (bottom)
        this._title = new St.Label({ style_class: 'vinyl-title', text: 'Vinyl Player' });
        this._title.set_position(50, 182);
        this._canvas.add_child(this._title);

        // Click to toggle play
        this._canvas.reactive = true;
        this._canvas.connect('button-press-event', () => this._togglePlay());

        // Popup menu
        this._menuManager = new Desklet.DeskletManager(this);
        this._popupManager = new PopupMenu.PopupMenuManager(this);
        this._popupMenu = new PopupMenu.PopupMenu(this._canvas, 0);

        const playItem = new PopupMenu.PopupMenuItem('Play / Pause');
        playItem.connect('activated', () => this._togglePlay());
        this._popupMenu.addMenuItem(playItem);

        const sep = new PopupMenu.PopupSeparatorMenuItem();
        this._popupMenu.addMenuItem(sep);

        const s33 = new PopupMenu.PopupMenuItem('33 RPM');
        s33.connect('activated', () => this._setSpeed(33));
        this._popupMenu.addMenuItem(s33);

        const s45 = new PopupMenu.PopupMenuItem('45 RPM');
        s45.connect('activated', () => this._setSpeed(45));
        this._popupMenu.addMenuItem(s45);

        this._popupManager.addMenu(this._popupMenu);

        this._desklet.header.add_child(this._canvas);
    }

    _applyColors() {
        if (!this._canvas) return;
        const fc = this._settings.get_property('fontColor');
        const pc = this._settings.get_property('playerColor');
        const rc = this._settings.get_property('recordColor');
        const lc = this._settings.get_property('labelColor');
        // Inject CSS custom properties
        const css = `color: ${fc};
--vinyl-platter-base: ${pc};
--vinyl-record: ${rc};
--vinyl-label: ${lc};`;
        this._canvas.set_style(css);
        // Also directly set title color
        if (this._title)
            this._title.set_style(`color: ${fc};`);
    }

    _togglePlay() {
        this._settings.setProperty('playing', !this._settings.get_property('playing'));
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

        const speed = this._settings.get_property('speed');
        const msPerRev = speed === 45 ? 60000 / 45 : 60000 / 33;
        const elapsed = Date.now() - this._startTime;
        this._angle = ((elapsed / msPerRev) * 360) % 360;

        this._record.rotation_angle_z = this._angle;
        this._label.rotation_angle_z = this._angle;
    }
};

function main(metadata, desklet, callback) {
    const player = new RecordPlayer(metadata, desklet);
    callback(player);
}
