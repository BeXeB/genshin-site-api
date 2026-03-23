# Markdown Test File

---

## Headings

# H1

## H2

### H3

#### H4

##### H5

###### H6

---

## Text Formatting

**Bold**\
_Italic_\
**_Bold & Italic_**\
~~Strikethrough~~

---

## Blockquote

> This is a blockquote.
>
> > This is a nested blockquote.

---

## Lists

### Unordered

- Item 1
- Item 2
  - Subitem 2.1
  - Subitem 2.2

### Ordered

1. First
2. Second
   1. Subitem 2.1
   2. Subitem 2.2

### Task List

- [x] Completed
- [ ] Not completed

---

## Links

[OpenAI](https://openai.com)

Autolink: <https://openai.com>

---

## Images

![Example Image](assets/images/Geo.webp)

![Geo Icon][geo-img]

[geo-img]: assets/images/Geo.webp

---

## Inline Code

Use the `print()` function.

---

## Code Blocks

```python
def greet(name):
    print(f"Hello, {name}!")

greet("World")
```

```javascript
function greet(name) {
  console.log("Hello, " + name + "!");
}
greet("World");
```

---

## Tables

| Name  | Role      | Element |
| ----- | --------- | ------- |
| Amber | Archer    | Pyro    |
| Lisa  | Mage      | Electro |
| Kaeya | Swordsman | Cryo    |

| Left | Center | Right |
| :--- | :----: | ----: |
| A    |   B    |     C |
| 1    |   2    |     3 |

---

## Escaping Characters

\*Not italic\*\
\# Not a heading\
\`Not code\`

---

## Nested Elements

> ### Quoted Heading
>
> - Nested list item
> - Another item
>   1. Subitem
>   2. Subitem

---

## HTML

<div class="test-box">
  <strong>HTML works inside Markdown</strong>
</div>

<div class="video">
  <iframe
    src="https://www.youtube.com/embed/uvn3H_7lnIw?si=tqsvjXAqy9-uSkTi"
    title="YouTube video player"
    frameborder="0"
    allow="
      accelerometer;
      autoplay;
      clipboard-write;
      encrypted-media;
      gyroscope;
      picture-in-picture;
      web-share"
    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
  ></iframe>
</div>
