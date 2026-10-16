"""Settings-Fenster: Links, Commands und allgemeine Einstellungen der Startseite."""

import math
import shutil
from collections.abc import Callable
from pathlib import Path

from PySide6.QtCore import QMimeData, QPoint, QRegularExpression, QSize, Qt
from PySide6.QtGui import (
    QColor,
    QDrag,
    QFontDatabase,
    QIcon,
    QPainter,
    QPixmap,
    QSyntaxHighlighter,
    QTextCharFormat,
    QTextDocument,
)
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QColorDialog,
    QDialog,
    QDialogButtonBox,
    QDoubleSpinBox,
    QFileDialog,
    QFormLayout,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListView,
    QListWidget,
    QListWidgetItem,
    QMenu,
    QPlainTextEdit,
    QPushButton,
    QSpinBox,
    QTabWidget,
    QToolButton,
    QVBoxLayout,
    QWidget,
    QWidgetAction,
)

from config import EMPTY_CELL, ICON_DIR, WEB_DIR, save_config, set_autostart

ICON_SIZE = 16  # Icon-Größe auf der Seite (style.css)
GALLERY_COLUMNS = 8
GALLERY_CELL = 32
FALLBACK_ICON = WEB_DIR / "gfx" / "link.svg"
IMAGE_FILTER = "Images (*.png *.svg *.ico *.gif *.jpg *.jpeg *.webp)"

Link = dict | None


def icon_pixmap(icon: str | None, color: str | None) -> QPixmap:
    """Lädt ein Icon in Seitengröße und färbt es so ein wie die CSS-Maske auf der Seite."""
    path = ICON_DIR / icon if icon else FALLBACK_ICON
    pixmap = QIcon(str(path)).pixmap(ICON_SIZE, ICON_SIZE)
    if color:
        painter = QPainter(pixmap)
        painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)
        painter.fillRect(pixmap.rect(), QColor(color))
        painter.end()
    return pixmap


def row_of(*widgets: QWidget) -> QWidget:
    row = QWidget()
    layout = QHBoxLayout(row)
    layout.setContentsMargins(0, 0, 0, 0)
    for widget in widgets:
        layout.addWidget(widget)
    layout.addStretch()
    return row


class IconPicker(QToolButton):
    """Dropdown mit einer Galerie aller vorhandenen Icons in Seitengröße."""

    def __init__(self, icon: str | None) -> None:
        super().__init__()
        self.gallery = QListWidget()
        self.gallery.setViewMode(QListView.ViewMode.IconMode)
        self.gallery.setMovement(QListView.Movement.Static)
        self.gallery.setIconSize(QSize(ICON_SIZE, ICON_SIZE))
        self.gallery.setGridSize(QSize(GALLERY_CELL, GALLERY_CELL))
        # Kachelfarbe der Seite, damit weiße Icons sichtbar sind.
        self.gallery.setStyleSheet("background: #252525;")
        self.gallery.itemClicked.connect(self.on_item_clicked)

        gallery_action = QWidgetAction(self)
        gallery_action.setDefaultWidget(self.gallery)
        menu = QMenu(self)
        menu.addAction(gallery_action)
        menu.aboutToShow.connect(self.fill_gallery)

        self.setMenu(menu)
        self.setPopupMode(QToolButton.ToolButtonPopupMode.InstantPopup)
        self.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextBesideIcon)
        self.setIconSize(QSize(ICON_SIZE, ICON_SIZE))
        self.set_icon(icon)

    def set_icon(self, icon: str | None) -> None:
        self.icon_name = icon
        self.setIcon(QIcon(icon_pixmap(icon, None)) if icon else QIcon())
        self.setText(icon or "Choose icon")

    def fill_gallery(self) -> None:
        self.gallery.clear()
        icon_files = sorted(path for path in ICON_DIR.glob("*") if path.is_file())
        for path in icon_files:
            item = QListWidgetItem(QIcon(str(path)), "")
            item.setToolTip(path.stem)
            item.setData(Qt.ItemDataRole.UserRole, path.name)
            self.gallery.addItem(item)
        rows = min(max(math.ceil(len(icon_files) / GALLERY_COLUMNS), 1), 8)
        frame = 2 * self.gallery.frameWidth() + 4
        self.gallery.setFixedSize(
            GALLERY_COLUMNS * GALLERY_CELL + frame + self.gallery.verticalScrollBar().sizeHint().width(),
            rows * GALLERY_CELL + frame,
        )

    def on_item_clicked(self, item: QListWidgetItem) -> None:
        self.set_icon(item.data(Qt.ItemDataRole.UserRole))
        self.menu().close()


class LinkDialog(QDialog):
    """Dialog zum Bearbeiten eines Links (Verknüpfung): Name, URL und optional Icon und Farbe."""

    DELETED = 2

    def __init__(self, parent: QWidget, link: Link, with_icon: bool) -> None:
        super().__init__(parent)
        self.setWindowTitle("Link")
        link = link or {}
        self.with_icon = with_icon

        self.title_edit = QLineEdit(link.get("title", ""))
        self.url_edit = QLineEdit(link.get("url", ""))
        self.url_edit.setMinimumWidth(400)

        form = QFormLayout(self)
        form.addRow("Name", self.title_edit)
        form.addRow("URL", self.url_edit)

        if with_icon:
            self.icon_picker = IconPicker(link.get("icon"))
            upload_button = QPushButton("Upload...")
            upload_button.clicked.connect(self.upload_icon)
            clear_icon_button = QPushButton("Clear")
            clear_icon_button.clicked.connect(lambda: self.icon_picker.set_icon(None))
            form.addRow("Icon", row_of(self.icon_picker, upload_button, clear_icon_button))

            self.color_button = QPushButton()
            self.color_button.clicked.connect(self.choose_color)
            clear_color_button = QPushButton("Clear")
            clear_color_button.clicked.connect(lambda: self.set_color(None))
            form.addRow("Color", row_of(self.color_button, clear_color_button))
            self.set_color(link.get("color"))

        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        delete_button = buttons.addButton("Delete", QDialogButtonBox.ButtonRole.DestructiveRole)
        delete_button.clicked.connect(lambda: self.done(self.DELETED))
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        form.addRow(buttons)

    def upload_icon(self) -> None:
        file_name, _ = QFileDialog.getOpenFileName(self, "Upload icon", "", IMAGE_FILTER)
        if file_name:
            ICON_DIR.mkdir(parents=True, exist_ok=True)
            shutil.copy(file_name, ICON_DIR / Path(file_name).name)
            self.icon_picker.set_icon(Path(file_name).name)

    def choose_color(self) -> None:
        color = QColorDialog.getColor(QColor(self.color or "#ffffff"), self)
        if color.isValid():
            self.set_color(color.name())

    def set_color(self, color: str | None) -> None:
        self.color = color
        swatch = QPixmap(ICON_SIZE, ICON_SIZE)
        swatch.fill(QColor(color) if color else Qt.GlobalColor.transparent)
        self.color_button.setIcon(QIcon(swatch))
        self.color_button.setText(color or "Choose color")

    def link(self) -> Link:
        title = self.title_edit.text().strip()
        url = self.url_edit.text().strip()
        if not title and not url:
            return None
        link = {"title": title, "url": url}
        if self.with_icon:
            link["icon"] = self.icon_picker.icon_name
            link["color"] = self.color
        return link


class JsHighlighter(QSyntaxHighlighter):
    """Zeilenweises JavaScript-Syntax-Highlighting für den Command-Editor."""

    KEYWORDS = (
        "async await break case catch class const continue default delete do else false finally for "
        "function if in instanceof let new null return switch this throw true try typeof undefined var "
        "void while"
    ).split()

    def __init__(self, document: QTextDocument) -> None:
        super().__init__(document)
        self.keyword_rules = [
            (QRegularExpression(r"\b(" + "|".join(self.KEYWORDS) + r")\b"), self.text_format("#0000ff")),
            (QRegularExpression(r"\b\d+(\.\d+)?\b"), self.text_format("#098658")),
        ]
        # Strings und Kommentare in einem Ausdruck, damit "//" in einer URL nicht als Kommentar zählt.
        self.string_or_comment = QRegularExpression(
            r"""(?<string>'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`)|(?<comment>//.*$)"""
        )
        self.string_format = self.text_format("#a31515")
        self.comment_format = self.text_format("#008000")

    @staticmethod
    def text_format(color: str) -> QTextCharFormat:
        text_format = QTextCharFormat()
        text_format.setForeground(QColor(color))
        return text_format

    def highlightBlock(self, text: str) -> None:
        for pattern, text_format in self.keyword_rules:
            self.apply(pattern, text, lambda match, text_format=text_format: text_format)
        self.apply(
            self.string_or_comment,
            text,
            lambda match: self.string_format if match.hasCaptured("string") else self.comment_format,
        )

    def apply(self, pattern: QRegularExpression, text: str, format_of: Callable) -> None:
        matches = pattern.globalMatch(text)
        while matches.hasNext():
            match = matches.next()
            self.setFormat(match.capturedStart(), match.capturedLength(), format_of(match))


class CommandsTab(QWidget):
    """Tab für die Commands (Befehle): Liste links, Editor für Pattern und JS-Code rechts."""

    def __init__(self, settings: "SettingsWindow") -> None:
        super().__init__()
        self.settings = settings
        self.commands: list[dict] = settings.config["commands"]
        code_font = QFontDatabase.systemFont(QFontDatabase.SystemFont.FixedFont)

        self.command_list = QListWidget()
        self.command_list.addItems([command["pattern"] for command in self.commands])
        self.command_list.currentRowChanged.connect(self.show_command)
        add_button = QPushButton("Add")
        add_button.clicked.connect(self.add_command)
        remove_button = QPushButton("Remove")
        remove_button.clicked.connect(self.remove_command)

        self.pattern_edit = QLineEdit()
        self.pattern_edit.setFont(code_font)
        self.pattern_edit.textEdited.connect(self.update_command)
        self.code_edit = QPlainTextEdit()
        self.code_edit.setFont(code_font)
        self.code_edit.textChanged.connect(self.update_command)
        self.highlighter = JsHighlighter(self.code_edit.document())

        self.editor = QWidget()
        editor_layout = QVBoxLayout(self.editor)
        editor_layout.setContentsMargins(0, 0, 0, 0)
        editor_layout.addWidget(QLabel("Pattern"))
        editor_layout.addWidget(self.pattern_edit)
        for line in ("(match) => {", None, "}"):
            if line is None:
                editor_layout.addWidget(self.code_edit)
            else:
                label = QLabel(line)
                label.setFont(code_font)
                editor_layout.addWidget(label)

        list_layout = QVBoxLayout()
        list_layout.addWidget(self.command_list)
        list_layout.addWidget(row_of(add_button, remove_button))

        layout = QHBoxLayout(self)
        layout.addLayout(list_layout, 1)
        layout.addWidget(self.editor, 3)

        self.command_list.setCurrentRow(0)
        self.show_command(self.command_list.currentRow())

    def show_command(self, row: int) -> None:
        self.editor.setEnabled(row >= 0)
        command = self.commands[row] if row >= 0 else {"pattern": "", "code": ""}
        self.pattern_edit.setText(command["pattern"])
        self.code_edit.blockSignals(True)
        self.code_edit.setPlainText(command["code"])
        self.code_edit.blockSignals(False)

    def update_command(self) -> None:
        row = self.command_list.currentRow()
        if row < 0:
            return
        self.commands[row] = {"pattern": self.pattern_edit.text(), "code": self.code_edit.toPlainText()}
        self.command_list.item(row).setText(self.commands[row]["pattern"])
        self.settings.save()

    def add_command(self) -> None:
        self.commands.append({"pattern": "", "code": ""})
        self.command_list.addItem("")
        self.command_list.setCurrentRow(len(self.commands) - 1)
        self.pattern_edit.setFocus()
        self.settings.save()

    def remove_command(self) -> None:
        row = self.command_list.currentRow()
        if row < 0:
            return
        self.commands.pop(row)
        self.command_list.takeItem(row)
        self.settings.save()


class SlotButton(QPushButton):
    """Button für einen Link-Platz der Seite; ein Klick öffnet den Link-Dialog.

    kind: "favorite" (Icon-Kachel), "list" (Tools/Books, nur Text) oder "more" (Icon und Text).
    """

    def __init__(
        self,
        settings: "SettingsWindow",
        get_link: Callable[[], Link],
        set_link: Callable[[Link], None],
        kind: str,
    ) -> None:
        super().__init__()
        self.settings = settings
        self.get_link = get_link
        self.set_link = set_link
        self.kind = kind
        self.setIconSize(QSize(ICON_SIZE, ICON_SIZE))
        if kind == "favorite":
            self.setFixedSize(64, 64)
        elif kind == "list":
            self.setFixedWidth(200)
        else:
            self.setFixedWidth(170)
        self.clicked.connect(self.edit)
        self.refresh()

    def refresh(self) -> None:
        link = self.get_link()
        font = self.font()
        font.setBold(self.kind == "more" and link is not None and not link["url"])
        self.setFont(font)
        self.setIcon(QIcon())
        self.setText("")
        self.setToolTip("")
        if link is None:
            return

        self.setToolTip(f"{link['title']}\n{link['url']}".strip())
        if self.kind == "favorite" and link["icon"]:
            self.setIcon(QIcon(icon_pixmap(link["icon"], link["color"])))
        elif self.kind == "more" and link["url"]:
            self.setIcon(QIcon(icon_pixmap(link["icon"], link["color"])))
            self.setText(link["title"] or link["url"])
        else:
            self.setText(link["title"])

    def edit(self) -> None:
        dialog = LinkDialog(self, self.get_link(), self.kind != "list")
        result = dialog.exec()
        if result == QDialog.DialogCode.Accepted:
            self.set_link(dialog.link())
        elif result == LinkDialog.DELETED:
            self.set_link(None)
        else:
            return
        self.settings.save()
        self.settings.refresh_slots()


class MoreCellButton(SlotButton):
    """Zelle im More-Raster; Zellen lassen sich per Drag & Drop wie im Inventar tauschen."""

    def __init__(self, settings: "SettingsWindow", row: int, column: int) -> None:
        self.row = row
        self.column = column
        self.drag_start: QPoint | None = None
        super().__init__(
            settings,
            lambda: settings.more_link(row, column),
            lambda link: settings.set_more_link(row, column, link),
            "more",
        )
        self.setAcceptDrops(True)

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self.drag_start = event.position().toPoint()
        super().mousePressEvent(event)

    def mouseMoveEvent(self, event) -> None:
        if self.drag_start is not None:
            distance = (event.position().toPoint() - self.drag_start).manhattanLength()
            if distance >= QApplication.startDragDistance():
                self.drag_start = None
                self.setDown(False)
                drag = QDrag(self)
                drag.setMimeData(QMimeData())
                drag.setPixmap(self.grab())
                drag.exec(Qt.DropAction.MoveAction)
                return
        super().mouseMoveEvent(event)

    def dragEnterEvent(self, event) -> None:
        source = event.source()
        if isinstance(source, MoreCellButton) and source is not self:
            event.acceptProposedAction()

    def dropEvent(self, event) -> None:
        source = event.source()
        self.settings.swap_more_cells(source.row, source.column, self.row, self.column)
        event.acceptProposedAction()
        source.refresh()
        self.refresh()


class SettingsWindow(QTabWidget):
    """Einstellungsfenster mit den Tabs Front, More, Commands und General."""

    def __init__(self, config: dict) -> None:
        super().__init__()
        self.config = config
        self.slot_buttons: list[SlotButton] = []
        self.setWindowTitle("MyStartPage Settings")
        self.setWindowIcon(QIcon(str(WEB_DIR / "gfx" / "favicon.png")))
        self.addTab(self.front_tab(), "Front")
        self.addTab(self.more_tab(), "More")
        self.addTab(CommandsTab(self), "Commands")
        self.addTab(self.general_tab(), "General")

    def save(self) -> None:
        save_config(self.config)

    def refresh_slots(self) -> None:
        for button in self.slot_buttons:
            button.refresh()

    def list_slot(self, name: str, index: int, kind: str) -> SlotButton:
        def set_link(link: Link) -> None:
            self.config[name][index] = link

        button = SlotButton(self, lambda: self.config[name][index], set_link, kind)
        self.slot_buttons.append(button)
        return button

    def front_tab(self) -> QWidget:
        tab = QWidget()
        layout = QHBoxLayout(tab)

        favorites = QGridLayout()
        for index in range(len(self.config["favorites"])):
            favorites.addWidget(self.list_slot("favorites", index, "favorite"), index // 4, index % 4)
        favorites.setRowStretch(favorites.rowCount(), 1)
        layout.addLayout(favorites)

        for name in ("tools", "books"):
            column = QVBoxLayout()
            for index in range(len(self.config[name])):
                column.addWidget(self.list_slot(name, index, "list"))
            column.addStretch()
            layout.addLayout(column)

        layout.addStretch()
        return tab

    def more_tab(self) -> QWidget:
        tab = QWidget()
        grid = QGridLayout(tab)
        for row, cells in enumerate(self.config["more"]["map"]):
            for column in range(len(cells)):
                button = MoreCellButton(self, row, column)
                self.slot_buttons.append(button)
                grid.addWidget(button, row, column)
        grid.setRowStretch(len(self.config["more"]["map"]), 1)
        grid.setColumnStretch(len(self.config["more"]["map"][0]), 1)
        return tab

    def more_link(self, row: int, column: int) -> Link:
        key = self.config["more"]["map"][row][column]
        return None if key == EMPTY_CELL else self.config["more"]["links"].get(key)

    def set_more_link(self, row: int, column: int, link: Link) -> None:
        more = self.config["more"]
        key = more["map"][row][column]
        if link is None:
            more["map"][row][column] = EMPTY_CELL
            # Ein Link kann in mehreren Zellen stehen und wird erst entfernt, wenn keine mehr darauf zeigt.
            if key != EMPTY_CELL and not any(key in cells for cells in more["map"]):
                more["links"].pop(key, None)
            return
        if key == EMPTY_CELL:
            numeric_keys = [int(existing) for existing in more["links"] if existing.isdigit()]
            key = str(max(numeric_keys, default=0) + 1)
            more["map"][row][column] = key
        more["links"][key] = link

    def swap_more_cells(self, row_a: int, column_a: int, row_b: int, column_b: int) -> None:
        cells = self.config["more"]["map"]
        cells[row_a][column_a], cells[row_b][column_b] = cells[row_b][column_b], cells[row_a][column_a]
        self.save()

    def general_tab(self) -> QWidget:
        tab = QWidget()
        general = self.config["general"]
        form = QFormLayout(tab)

        for key, label in (("user_name", "Name"), ("api_key", "OpenWeather API key"), ("search_engine", "Search engine")):
            edit = QLineEdit(general[key])
            edit.textChanged.connect(lambda value, key=key: self.set_general(key, value))
            form.addRow(label, edit)

        for key, label, limit in (("latitude", "Latitude", 90), ("longitude", "Longitude", 180)):
            spin_box = QDoubleSpinBox()
            spin_box.setDecimals(7)
            spin_box.setRange(-limit, limit)
            spin_box.setValue(general[key])
            spin_box.valueChanged.connect(lambda value, key=key: self.set_general(key, value))
            form.addRow(label, spin_box)

        new_tab_box = QCheckBox()
        new_tab_box.setChecked(general.get("open_in_new_tab", False))
        new_tab_box.toggled.connect(lambda checked: self.set_general("open_in_new_tab", checked))
        form.addRow("Open links in new tab", new_tab_box)

        port_box = QSpinBox()
        port_box.setRange(1, 65535)
        port_box.setValue(general["port"])
        port_box.valueChanged.connect(lambda value: self.set_general("port", value))
        form.addRow("Port", port_box)

        autostart_box = QCheckBox()
        autostart_box.setChecked(general["autostart"])
        autostart_box.toggled.connect(self.set_autostart)
        form.addRow("Start with system", autostart_box)
        return tab

    def set_general(self, key: str, value: object) -> None:
        self.config["general"][key] = value
        self.save()

    def set_autostart(self, enabled: bool) -> None:
        set_autostart(enabled)
        self.set_general("autostart", enabled)
