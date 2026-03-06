/*
 * remove "example_" from the filename and enter your API key and Location in the lines below.
 */
document['getApiKey'] = () => ('Your api key here');
document['getLocation'] = () => ([1.0000000, 1.0000000]);
document['getUserName'] = () => ('Your name');
document['getContentData'] = () => ({
    favorites: [ // Try using a number of 8 favorites or somthing else dividable by 4.
        {
            icon: 'duckduckgo.png', // this icon is not included its an example ;)
            title: 'DuckDuckGo',
            url: 'https://duckduckgo.com/',
            alt: 'D'
        }
    ],
    tools: [
        ['regex 101', 'https://regex101.com/'],
        ['jsfiddle', 'https://jsfiddle.net/']
    ],
    books: [
        ['askubuntu', 'https://askubuntu.com/'],
        ['ArchWiki', 'https://wiki.archlinux.org/']
    ],
    old_more: [
        ['', 'Example Title'],
		['', 'Search Engines'],
        ['https://google.com/', 'Google'],
        ['', 'One empty space'],
        [],
        ['', 'Three empty spaces'],
        [3],
        ['https://example.org/', 'Just a link']
    ],
    more: {
        links: {
            "1": ['', 'Example Title'],
		    "2": ['', 'Search Engines'],
            "3": ['https://google.com/', 'Google'],
            "b": ['https://bing.com/', 'Bing'],
            "4": ['', 'One empty space'],
            "0": [],
            "5": ['', 'Three empty spaces'],
            "0": [3],
            "6": ['https://example.org/', 'Just a link']
        },
        map: [
            [ "1",  "2", "0"],
            [ "4",  "3", "0"],
            [ "0",  "b", "0"],
            [ "5",  "0", "0"],
            [ "0",  "0", "0"],
            [ "0",  "0", "0"],
            [ "0",  "0", "0"],
            [ "6",  "0", "6"],
        ]
    }
});