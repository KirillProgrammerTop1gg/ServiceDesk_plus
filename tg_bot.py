from aiogram import Bot, Dispatcher, types, Router, F
from aiogram.filters import Command
from sqlalchemy.future import select
from typing import Optional
import os
import re

from project_models import (
    UsersInTelegram,
    async_session,
    Problem,
    AdminResponse,
    User,
)

BOT_TOKEN = os.environ.get("BOT_TOKEN")
bot = Bot(token=BOT_TOKEN)
router = Router()
dp = Dispatcher()


def strip_tags(text: str) -> str:
    """
    Strips HTML tags and basic markdown symbols to prevent Telegram message parsing errors.
    """
    if not text:
        return ""
    # Strip HTML tags
    clean = re.sub(r'<[^>]*>', '', text)
    # Strip basic markdown symbols (*, _, `, [)
    clean = clean.replace('*', '').replace('_', '').replace('`', '')
    return clean


def escape_for_tg_html(text: str) -> str:
    """
    Safely escapes raw HTML characters except for standard, allowed Telegram HTML formatting tags.
    Translates block tags like <p>, <li>, etc., to nice Telegram formatting and strips other tags.
    """
    if not text:
        return ""
    import html
    import re
    
    # Standard allowed Telegram HTML tags
    allowed_tags = {"b", "strong", "i", "em", "u", "ins", "s", "strike", "del", "a", "code", "pre", "blockquote"}
    
    # Match HTML tags
    tag_regex = re.compile(r'(</?[a-zA-Z0-9_-]+(?:\s+[^>]*)?>)')
    parts = tag_regex.split(text)
    
    result_parts = []
    for part in parts:
        if part.startswith('<') and part.endswith('>'):
            match = re.match(r'^<(/?)([a-zA-Z0-9_-]+)(?:\s+([^>]*))?/?>$', part)
            if match:
                is_closing = match.group(1) == '/'
                tag_name = match.group(2).lower()
                attrs = match.group(3) or ''
                
                if tag_name in allowed_tags:
                    if is_closing:
                        result_parts.append(f"</{tag_name}>")
                    else:
                        if tag_name == 'a' and attrs:
                            # Keep only href attribute
                            href_match = re.search(r'(?i)\bhref\s*=\s*["\']([^"\']*)["\']', attrs)
                            if href_match:
                                href = href_match.group(1).replace('"', '&quot;')
                                result_parts.append(f'<a href="{href}">')
                            else:
                                result_parts.append(f"<a>")
                        else:
                            result_parts.append(f"<{tag_name}>")
                    continue
                elif tag_name == 'br':
                    result_parts.append("\n")
                    continue
                elif tag_name in ('p', 'div'):
                    result_parts.append("\n")
                    continue
                elif tag_name == 'li':
                    if not is_closing:
                        result_parts.append("\n• ")
                    continue
                elif tag_name in ('ul', 'ol'):
                    continue
                elif tag_name in ('h1', 'h2', 'h3', 'h4', 'h5', 'h6'):
                    if is_closing:
                        result_parts.append("</b>\n")
                    else:
                        result_parts.append("\n<b>")
                    continue
                elif tag_name == 'span':
                    continue
            
            # Skip/strip any other tags to prevent Telegram API errors
            continue
        else:
            # This is text, escape it
            result_parts.append(html.escape(part))
            
    res_text = "".join(result_parts)
    # Clean up excessive or trailing/leading newlines
    res_text = re.sub(r'\n{3,}', '\n\n', res_text)
    return res_text.strip()


# Helper to get linked site user ID from Telegram chat ID
async def get_site_user_id(chat_id: int) -> Optional[int]:
    async with async_session() as session:
        result = await session.execute(
            select(UsersInTelegram).filter_by(user_tg_id=str(chat_id))
        )
        user = result.scalars().one_or_none()
        return user.user_in_site if user else None


# Helper to get User model by site user ID
async def get_user(site_user_id: int) -> Optional[User]:
    async with async_session() as session:
        return await session.get(User, site_user_id)


# Helper to send a message to a site user via Telegram
async def send_msg(user_site_id: int, message_text: str, reply_markup=None, parse_mode="HTML"):
    try:
        async with async_session() as session:
            user_tg_info = await session.execute(
                select(UsersInTelegram).filter_by(user_in_site=user_site_id)
            )
            user_tg_info = user_tg_info.scalars().one_or_none()
            if user_tg_info and user_tg_info.user_tg_id:
                try:
                    if parse_mode == "HTML":
                        cleaned_text = escape_for_tg_html(message_text)
                        await bot.send_message(
                            chat_id=user_tg_info.user_tg_id,
                            text=cleaned_text,
                            reply_markup=reply_markup,
                            parse_mode="HTML"
                        )
                    else:
                        cleaned_text = strip_tags(message_text)
                        await bot.send_message(
                            chat_id=user_tg_info.user_tg_id,
                            text=cleaned_text,
                            reply_markup=reply_markup
                        )
                except Exception as e:
                    print(f"Error sending message to {user_tg_info.user_tg_id}: {e}")
    except Exception as e:
        print(f"General error in send_msg for user {user_site_id}: {e}")


def get_read_keyboard(problem_id: int) -> types.InlineKeyboardMarkup:
    """
    Returns an inline keyboard to view status of the request.
    """
    button = types.InlineKeyboardButton(
        text="👁 Статус заявки",
        callback_data=f"status_btn_{problem_id}"
    )
    return types.InlineKeyboardMarkup(inline_keyboard=[[button]])


@router.callback_query(F.data.startswith("status_btn_"))
async def status_btn_callback_handler(callback: types.CallbackQuery):
    try:
        parts = callback.data.split("_")
        if len(parts) != 3 or not parts[2].isdigit():
            await callback.answer("Некоректний ідентифікатор")
            return
            
        prob_id = int(parts[2])
        site_user_id = await get_site_user_id(callback.message.chat.id)
        if not site_user_id:
            await callback.answer("Ваш акаунт не прив'язаний.")
            return
            
        async with async_session() as session:
            user = await session.get(User, site_user_id)
            if not user:
                await callback.answer("Користувача не знайдено.")
                return
                
            prob = await session.get(Problem, prob_id)
            if not prob:
                await callback.answer("Заявку не знайдено.")
                return
                
            has_access = False
            if prob.user_id == site_user_id:
                has_access = True
            elif user.role in ["admin", "manager"]:
                has_access = True
            elif user.role == "master":
                if prob.admin_id is None or prob.admin_id == site_user_id:
                    has_access = True
                    
            if not has_access:
                await callback.answer("У вас немає доступу до цієї заявки.")
                return
                
            ans_result = await session.execute(
                select(AdminResponse).filter_by(problem_id=prob_id).order_by(AdminResponse.date_responded.asc())
            )
            answers = ans_result.scalars().all()
            
            assignee_name = "не призначено"
            if prob.admin_id:
                assignee_user = await session.get(User, prob.admin_id)
                if assignee_user:
                    assignee_name = assignee_user.username
    
            title_clean = strip_tags(prob.title)
            desc_clean = strip_tags(prob.description)
            
            details = (
                f"📋 Заявка #{prob.id}\n"
                f"Заголовок: {title_clean}\n"
                f"Опис: {desc_clean}\n"
                f"Статус: {prob.status}\n"
                f"Майстер: {assignee_name}\n"
                f"Дата створення: {prob.date_created.strftime('%d.%m.%Y %H:%M') if prob.date_created else '—'}\n"
            )
            
            if prob.proposed_price:
                status_map = {
                    "proposed": "запропоновано менеджером",
                    "accepted": "узгоджено та підтверджено",
                    "declined": "відхилено клієнтом"
                }
                price_st = status_map.get(prob.price_status, prob.price_status)
                details += f"💰 Ціна ремонту: {prob.proposed_price} грн ({price_st})\n"
                
            if user.role in ["admin", "manager", "master"]:
                details += f"📝 Внутрішні нотатки: {strip_tags(prob.notes) or '—'}\n"
    
            visible_answers = []
            for ans in answers:
                if user.role in ["admin", "manager", "master"]:
                    visible_answers.append(ans)
                else:
                    if not ans.is_private:
                        visible_answers.append(ans)
    
            if visible_answers:
                details += "\n💬 Історія чату:\n"
                for ans in visible_answers:
                    sender_name = "Користувач"
                    sender = await session.get(User, ans.admin_id)
                    if sender:
                        sender_name = f"{sender.username} ({sender.role})"
                    
                    private_tag = "🔒 [Приватна] " if ans.is_private else ""
                    ans_text = strip_tags(ans.message)
                    details += f"- {private_tag}{sender_name}: {ans_text}\n"
            
            await callback.message.answer(details)
            await callback.answer()
    except Exception as e:
        print(f"Error in status callback: {e}")
        await callback.answer("Помилка при отриманні статусу")


# -------------------- Basic registration flow ────────────────────
@router.message(Command("start"))
async def start_handler(message: types.Message):
    # Support deep linking like /start TG_CODE
    args = message.text.split()
    user_tg_id = str(message.chat.id)
    
    if len(args) == 2:
        user_code = args[1].strip()
        async with async_session() as session:
            # Check if this Telegram ID is already linked to ANY user
            already_linked_query = await session.execute(
                select(UsersInTelegram).filter_by(user_tg_id=user_tg_id)
            )
            already_linked = already_linked_query.scalars().all()
            if already_linked:
                await message.answer(
                    "Цей Telegram-акаунт вже прив'язаний до профілю. "
                    "Будь ласка, спочатку відв'яжіть його в особистому кабінеті на сайті."
                )
                return

            user_check = await session.execute(
                select(UsersInTelegram).filter_by(tg_code=user_code)
            )
            user_check = user_check.scalars().one_or_none()
            if user_check:
                if user_check.user_tg_id:
                    await message.answer(
                        "Цей код вже використано для прив'язки іншого Telegram-акаунта. "
                        "Будь ласка, спочатку відв'яжіть його в особистому кабінеті на сайті."
                    )
                    return
                user_check.user_tg_id = user_tg_id
                session.add(user_check)
                await session.commit()
                await message.answer("Вітаємо! Ваш акаунт успішно прив'язано до Telegram. Будемо тримати Вас в курсі усіх подій!")
                return
            else:
                await message.answer(
                    "Код недійсний. Переконайтеся, що код написано правильно, "
                    "або згенеруйте новий в особистому кабінеті на сайті."
                )
                return

    await message.answer(
        "Вітаємо! Для отримання сповіщень про ваші заявки введіть код підтвердження, "
        "який Ви отримали в особистому кабінеті на сайті."
    )


# -------------------- Profile Command --------------------
@router.message(Command("me"))
async def me_handler(message: types.Message):
    site_user_id = await get_site_user_id(message.chat.id)
    if not site_user_id:
        await message.answer(
            "Ваш Telegram акаунт не прив'язаний до профілю на сайті. "
            "Будь ласка, прив'яжіть його в налаштуваннях вашого особистого кабінету на сайті."
        )
        return
    
    user = await get_user(site_user_id)
    if not user:
        await message.answer("Помилка: Користувача не знайдено.")
        return
        
    role_labels = {
        "admin": "Адміністратор 🛠️",
        "manager": "Менеджер 💼",
        "master": "Майстер 🔧",
        "client": "Клієнт 👤",
    }
    role = role_labels.get(user.role, "Клієнт 👤")
    await message.answer(
        f"👤 Ваш профіль:\n\n"
        f"ID на сайті: {user.id}\n"
        f"Логін: {user.username}\n"
        f"Email: {user.email}\n"
        f"Роль: {role}"
    )


# -------------------- Role-based Requests Overview --------------------
@router.message(Command("requests"))
@router.message(Command("my"))
async def requests_handler(message: types.Message):
    site_user_id = await get_site_user_id(message.chat.id)
    if not site_user_id:
        await message.answer(
            "Ваш Telegram акаунт не прив'язаний до профілю на сайті. "
            "Будь ласка, прив'яжіть його в налаштуваннях вашого особистого кабінету на сайті."
        )
        return
    
    user = await get_user(site_user_id)
    if not user:
        await message.answer("Помилка: Користувача не знайдено.")
        return

    async with async_session() as session:
        if user.role in ["admin", "manager"]:
            result = await session.execute(
                select(Problem).order_by(Problem.id.desc())
            )
            problems = result.scalars().all()
            title_text = "📋 Список всіх заявок у системі:"
            empty_text = "У системі немає жодної заявки."
        elif user.role == "master":
            result = await session.execute(
                select(Problem).filter(
                    (Problem.admin_id == user.id) |
                    ((Problem.status == "Прийнято") & (Problem.admin_id == None))
                ).order_by(Problem.id.desc())
            )
            problems = result.scalars().all()
            title_text = "📋 Призначені вам або доступні для вибору заявки:"
            empty_text = "У вас немає призначених або доступних заявок."
        else:
            result = await session.execute(
                select(Problem).filter_by(user_id=user.id).order_by(Problem.id.desc())
            )
            problems = result.scalars().all()
            title_text = "📋 Ваші заявки:"
            empty_text = "У вас немає зареєстрованих заявок."

        if not problems:
            await message.answer(empty_text)
            return

        lines = [title_text]
        for p in problems:
            title_clean = strip_tags(p.title)
            if len(title_clean) > 30:
                title_clean = title_clean[:27] + "..."
            lines.append(f"• #{p.id} | {title_clean} — {p.status}")
        
        lines.append("\n🔍 Для перегляду детального статусу та коментарів використовуйте:\n/status <id>")
        
        full_msg = "\n".join(lines)
        if len(full_msg) > 4000:
            chunks = [full_msg[i:i+4000] for i in range(0, len(full_msg), 4000)]
            for chunk in chunks:
                await message.answer(chunk)
        else:
            await message.answer(full_msg)


# -------------------- Detailed Request Status --------------------
@router.message(Command("status"))
@router.message(Command("view"))
async def status_handler(message: types.Message):
    site_user_id = await get_site_user_id(message.chat.id)
    if not site_user_id:
        await message.answer(
            "Ваш Telegram акаунт не прив'язаний до профілю на сайті. "
            "Будь ласка, прив'яжіть його в налаштуваннях вашого особистого кабінету на сайті."
        )
        return
        
    parts = message.text.split()
    if len(parts) != 2 or not parts[1].isdigit():
        await message.answer("Використайте: /status <id заявки>")
        return
        
    prob_id = int(parts[1])
    
    async with async_session() as session:
        user = await session.get(User, site_user_id)
        if not user:
            await message.answer("Користувача не знайдено.")
            return
            
        prob = await session.get(Problem, prob_id)
        if not prob:
            await message.answer("Заявку не знайдено.")
            return
            
        # Permission check:
        # Client can only see their own requests
        # Master can see assigned to them, or unassigned requests (where status == "Прийнято" or they are admin_id is None)
        # Admin / Manager can see all
        has_access = False
        if prob.user_id == site_user_id:
            has_access = True
        elif user.role in ["admin", "manager"]:
            has_access = True
        elif user.role == "master":
            if prob.admin_id is None or prob.admin_id == site_user_id:
                has_access = True
                
        if not has_access:
            await message.answer("У вас немає доступу до цієї заявки.")
            return
            
        ans_result = await session.execute(
            select(AdminResponse).filter_by(problem_id=prob_id).order_by(AdminResponse.date_responded.asc())
        )
        answers = ans_result.scalars().all()
        
        assignee_name = "не призначено"
        if prob.admin_id:
            assignee_user = await session.get(User, prob.admin_id)
            if assignee_user:
                assignee_name = assignee_user.username

        title_clean = strip_tags(prob.title)
        desc_clean = strip_tags(prob.description)
        
        details = (
            f"📋 Заявка #{prob.id}\n"
            f"Заголовок: {title_clean}\n"
            f"Опис: {desc_clean}\n"
            f"Статус: {prob.status}\n"
            f"Майстер: {assignee_name}\n"
            f"Дата створення: {prob.date_created.strftime('%d.%m.%Y %H:%M') if prob.date_created else '—'}\n"
        )
        
        if prob.proposed_price:
            status_map = {
                "proposed": "запропоновано менеджером",
                "accepted": "узгоджено та підтверджено",
                "declined": "відхилено клієнтом"
            }
            price_st = status_map.get(prob.price_status, prob.price_status)
            details += f"💰 Ціна ремонту: {prob.proposed_price} грн ({price_st})\n"
            
        if user.role in ["admin", "manager", "master"]:
            details += f"📝 Внутрішні нотатки: {strip_tags(prob.notes) or '—'}\n"

        # Filters comments based on the user's role: client only receives public comments, staff receives all
        visible_answers = []
        for ans in answers:
            if user.role in ["admin", "manager", "master"]:
                visible_answers.append(ans)
            else:
                if not ans.is_private:
                    visible_answers.append(ans)

        if visible_answers:
            details += "\n💬 Історія чату:\n"
            for ans in visible_answers:
                sender_name = "Користувач"
                sender = await session.get(User, ans.admin_id)
                if sender:
                    sender_name = f"{sender.username} ({sender.role})"
                
                private_tag = "🔒 [Приватна] " if ans.is_private else ""
                ans_text = strip_tags(ans.message)
                details += f"- {private_tag}{sender_name}: {ans_text}\n"

        await message.answer(details)


# -------------------- Help Command --------------------
@router.message(Command("help"))
async def help_command_handler(message: types.Message):
    site_user_id = await get_site_user_id(message.chat.id)
    if not site_user_id:
        await message.answer(
            "Ваш Telegram акаунт не прив'язаний до профілю на сайті.\n"
            "Будь ласка, прив'яжіть його в налаштуваннях вашого особистого кабінету на сайті."
        )
        return
    
    user = await get_user(site_user_id)
    if not user:
        await message.answer("Помилка: Користувача не знайдено.")
        return
        
    if user.role == "master":
        await message.answer(
            "🔧 Меню допомоги для Майстра:\n\n"
            "📋 /requests - Переглянути призначені вам або доступні заявки\n"
            "🔍 /status <id> - Детальний перегляд заявки та історії повідомлень\n"
            "👤 /me - Переглянути свій профіль\n"
            "❓ /help - Показати це меню допомоги"
        )
    elif user.role in ["admin", "manager"]:
        role_label = "Адміністратора" if user.role == "admin" else "Менеджера"
        await message.answer(
            f"💼 Меню допомоги для {role_label}:\n\n"
            "📋 /requests - Переглянути список всіх заявок в системі\n"
            "🔍 /status <id> - Детальний перегляд будь-якої заявки та чату\n"
            "👤 /me - Переглянути свій профіль\n"
            "❓ /help - Показати це меню допомоги"
        )
    else:
        await message.answer(
            "👤 Меню допомоги для Клієнта:\n\n"
            "📋 /requests - Переглянути ваші заявки\n"
            "🔍 /status <id> - Переглянути детальний статус та історію публічного чату\n"
            "👤 /me - Переглянути свій профіль\n"
            "❓ /help - Показати це меню допомоги"
        )


# -------------------- Fallback / Text message handler --------------------
@router.message()
async def text_message_handler(message: types.Message):
    site_user_id = await get_site_user_id(message.chat.id)
    if site_user_id:
        await help_command_handler(message)
        return

    # Unregistered user text input - try treating as a registration code
    user_code = message.text.strip() if message.text else ""
    if len(user_code) == 6 and user_code.isalnum():
        user_tg_id = str(message.chat.id)
        async with async_session() as session:
            already_linked_query = await session.execute(
                select(UsersInTelegram).filter_by(user_tg_id=user_tg_id)
            )
            already_linked = already_linked_query.scalars().all()
            if already_linked:
                await message.answer("Цей Telegram-акаунт вже прив'язаний до іншого профілю.")
                return

            user_check = await session.execute(
                select(UsersInTelegram).filter_by(tg_code=user_code)
            )
            user_check = user_check.scalars().one_or_none()
            if user_check:
                if user_check.user_tg_id:
                    await message.answer(
                        "Цей код вже використано для прив'язки іншого Telegram-акаунта. "
                        "Будь ласка, спочатку відв'яжіть його в особистому кабінеті."
                    )
                    return
                user_check.user_tg_id = user_tg_id
                session.add(user_check)
                await session.commit()
                await message.answer("Вітаємо! Ваш акаунт успішно прив'язано до Telegram. Будемо тримати Вас в курсі усіх подій!")
                return

    await message.answer(
        "Ваш чат не прив’язаний до користувача.\n\n"
        "Надішліть код підтвердження (6 символів), який ви отримали під час реєстрації в особистому кабінеті на сайті."
    )


async def start():
    dp.include_router(router)
    await dp.start_polling(bot)
