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
    ]
});