module.exports.cleanString = (string) => {
    return string
        .trim()
        .replace(/\s+/g, " ")
        .split(" ")
        .map((item) => item[0].toUpperCase() + item.slice(1).toLowerCase())
        .join(" ");
};

module.exports.cityToUrl = (city) => {
    return city.replace(" ", "-");
};

//alternative to trim: recursive function to remove spaces at beginning of word
// function remove(string) {
//     if (string.startsWith(" ")) {
//         let string1 = string.slice(1);
//         console.log(string1);
//         return remove(string1);
//     } else {
//         return string;
//     }
// }
