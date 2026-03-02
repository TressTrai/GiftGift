import Phaser from 'phaser';
import { SCENE_KEYS, COLORS, PASSWORD_MIN_LENGTH } from '../utils/constants';
import { saveToken, isTutorialSeen } from '../utils/storage';
import { login, register } from '../api/auth';
import { fetchState } from '../api/game';
import { gameStore } from '../store/GameStore';

/**
 * AuthScene — экран входа/регистрации.
 * Простая форма: имя + пароль + кнопка войти/зарегистрироваться.
 * После успеха → TutorialScene (первый раз) или GameScene+UIScene.
 */
export class AuthScene extends Phaser.Scene {
  private isLoginMode = true;
  private errorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: SCENE_KEYS.AUTH });
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.add.rectangle(0, 0, width, height, COLORS.BG).setOrigin(0);

    this.add
      .text(cx, height * 0.15, 'Февромарт', {
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#ffb347',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, height * 0.22, 'Игра дарения подарков', {
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // DOM-элементы для полей ввода (HTMLInputElement внутри Phaser)
    const nameInput = this.add
      .dom(cx, height * 0.38)
      .createFromHTML(
        '<input type="text" placeholder="Твоё имя" maxlength="30" ' +
        'style="width:260px;padding:12px;border-radius:8px;border:none;' +
        'font-size:16px;text-align:center;background:#2a2a4e;color:#fff;" />',
      );

    const passwordInput = this.add
      .dom(cx, height * 0.50)
      .createFromHTML(
        '<input type="password" placeholder="Пароль" maxlength="50" ' +
        `style="width:260px;padding:12px;border-radius:8px;border:none;` +
        `font-size:16px;text-align:center;background:#2a2a4e;color:#fff;" />`,
      );

    // Кнопка действия
    const btnBg = this.add
      .rectangle(cx, height * 0.62, 260, 48, COLORS.PRIMARY, 1)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add
      .text(cx, height * 0.62, 'Войти', { fontSize: '18px', color: '#fff' })
      .setOrigin(0.5);

    this.errorText = this.add
      .text(cx, height * 0.71, '', { fontSize: '14px', color: '#ff6b6b' })
      .setOrigin(0.5);

    // Переключатель режима
    const modeText = this.add
      .text(cx, height * 0.78, 'Нет аккаунта? Зарегистрироваться', {
        fontSize: '14px',
        color: '#87ceeb',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    modeText.on('pointerup', () => {
      this.isLoginMode = !this.isLoginMode;
      btnText.setText(this.isLoginMode ? 'Войти' : 'Зарегистрироваться');
      modeText.setText(
        this.isLoginMode
          ? 'Нет аккаунта? Зарегистрироваться'
          : 'Уже есть аккаунт? Войти',
      );
    });

    btnBg.on('pointerup', async () => {
      const name = (nameInput.node.querySelector('input') as HTMLInputElement).value.trim();
      const password = (passwordInput.node.querySelector('input') as HTMLInputElement).value;

      if (!name || !password) {
        this.showError('Заполни все поля');
        return;
      }
      if (password.length < PASSWORD_MIN_LENGTH) {
        this.showError(`Пароль минимум ${PASSWORD_MIN_LENGTH} символа`);
        return;
      }

      btnBg.disableInteractive();
      btnText.setText('...');

      try {
        const session = this.isLoginMode
          ? await login(name, password)
          : await register(name, password);

        saveToken(session.token);
        const state = await fetchState();
        gameStore.init(state);

        const nextScene = isTutorialSeen() ? SCENE_KEYS.GAME : SCENE_KEYS.TUTORIAL;
        this.scene.start(nextScene);
        if (nextScene === SCENE_KEYS.GAME) {
          this.scene.start(SCENE_KEYS.UI);
        }
      } catch (e) {
        this.showError((e as Error).message);
        btnBg.setInteractive({ useHandCursor: true });
        btnText.setText(this.isLoginMode ? 'Войти' : 'Зарегистрироваться');
      }
    });
  }

  private showError(msg: string): void {
    this.errorText.setText(msg);
    this.time.delayedCall(3000, () => this.errorText.setText(''));
  }
}
