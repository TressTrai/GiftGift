import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, CSS, FONT, FS, RADIUS } from '../utils/constants';
import { updateName } from '../api/auth';
import { gameStore } from '../store/GameStore';

export class ProfileScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.PROFILE });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const s = width / 390;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.add
      .text(cx, Math.round(20 * s), 'Профиль', {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XL * s)}px`,
        fontStyle: 'bold',
        color: CSS.TEXT,
      })
      .setOrigin(0.5, 0);

    this.add
      .text(cx, Math.round(90 * s), gameStore.user.name, {
        fontFamily: FONT.TITLE,
        fontSize: `${Math.round(FS.XXL * s)}px`,
        fontStyle: 'bold',
        color: CSS.ACCENT_AMBER,
      })
      .setOrigin(0.5);

    const completed = gameStore.personalGoal.completedCount;
    const triLabel = completed === 0
      ? 'Троек целей закрыто: 0'
      : `Троек целей закрыто: ${completed} 🎯`;
    this.add
      .text(cx, Math.round(136 * s), triLabel, {
        fontFamily: FONT.BODY,
        fontSize: `${Math.round(FS.MD * s)}px`,
        color: completed > 0 ? CSS.SUCCESS : CSS.TEXT_DIM,
      })
      .setOrigin(0.5);

    this.createButton(cx, Math.round(200 * s), Math.round(270 * s), Math.round(50 * s), s,
      'Изменить имя', () => this.openChangeName(s));

    this.add.rectangle(cx, Math.round(272 * s), width - Math.round(64 * s), Math.round(1.5 * s), COLORS.DIVIDER).setOrigin(0.5);

    this.createButton(cx, Math.round(310 * s), Math.round(270 * s), Math.round(50 * s), s,
      'Как играть', () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.stop(SCENE_KEYS.GAME);
        this.scene.start(SCENE_KEYS.TUTORIAL);
      });
  }

  private createButton(
    x: number, y: number, w: number, h: number, s: number,
    label: string, cb: () => void,
  ): void {
    const r = Math.round(RADIUS.MD * s);

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.BG_CARD);
    bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
    bg.lineStyle(1.5, COLORS.ITEM_BORDER);
    bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    bg.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });

    this.add.text(x, y, label, {
      fontFamily: FONT.BODY,
      fontSize: `${Math.round(FS.MD * s)}px`,
      color: CSS.TEXT,
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(COLORS.BUTTON_HOVER, 0.3);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
      bg.lineStyle(1.5, COLORS.ACCENT_CORAL);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    });
    bg.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(COLORS.BG_CARD);
      bg.fillRoundedRect(x - w / 2, y - h / 2, w, h, r);
      bg.lineStyle(1.5, COLORS.ITEM_BORDER);
      bg.strokeRoundedRect(x - w / 2, y - h / 2, w, h, r);
    });
    bg.on('pointerup', cb);
  }

  private openChangeName(s: number): void {
    const formW = Math.round(290 * s);
    const pad   = Math.round(24 * s);
    const fnt   = Math.round(FS.MD * s);
    const bfnt  = Math.round(FS.SM * s);
    const r     = Math.round(RADIUS.LG * s);
    const inpR  = Math.round(RADIUS.SM * s);
    const btnR  = Math.round(RADIUS.SM * s);

    const dom = this.add.dom(this.scale.width / 2, this.scale.height / 2).createFromHTML(`
      <div style="background:${CSS.BG_CARD};padding:${pad}px;border-radius:${r}px;
                  width:${formW}px;text-align:center;
                  box-shadow:0 4px 24px rgba(61,43,31,0.15);font-family:Nunito,sans-serif">
        <p style="color:${CSS.TEXT};margin-bottom:${Math.round(12*s)}px;font-size:${fnt}px">Новое имя:</p>
        <input id="nameInput" type="text" maxlength="30"
          style="width:100%;padding:${Math.round(11*s)}px;border-radius:${inpR}px;
                 border:1.5px solid ${CSS.DIVIDER};font-size:${fnt}px;font-family:Nunito,sans-serif;
                 background:${CSS.BG_INPUT};color:${CSS.TEXT};text-align:center;
                 box-sizing:border-box;outline:none" />
        <br/><br/>
        <button id="saveBtn"
          style="background:${CSS.BUTTON_PRIMARY};color:${CSS.TEXT_LIGHT};border:none;
                 padding:${Math.round(11*s)}px ${Math.round(26*s)}px;
                 border-radius:${btnR}px;font-size:${bfnt}px;font-family:Nunito,sans-serif;
                 cursor:pointer;font-weight:700">
          Сохранить
        </button>
        <button id="cancelBtn"
          style="background:${CSS.DIVIDER};color:${CSS.TEXT};border:none;
                 padding:${Math.round(11*s)}px ${Math.round(26*s)}px;
                 border-radius:${btnR}px;font-size:${bfnt}px;font-family:Nunito,sans-serif;
                 cursor:pointer;margin-left:${Math.round(8*s)}px">
          Отмена
        </button>
      </div>
    `);

    dom.addListener('click');
    dom.on('click', async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.id === 'cancelBtn') { dom.destroy(); return; }
      if (target.id === 'saveBtn') {
        const input = dom.getChildByID('nameInput') as HTMLInputElement;
        const name = input.value.trim();
        if (!name) return;
        await updateName(name).catch(() => {});
        gameStore.get().user.name = name;
        dom.destroy();
        this.scene.restart();
      }
    });
  }
}
