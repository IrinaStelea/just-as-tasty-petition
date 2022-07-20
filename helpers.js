module.exports.capitalize = (string) => {
    return string
        .trimStart()
        .split(" ")
        .map((item) => item[0].toUpperCase() + item.slice(1))
        .join(" ");
};
